import React from 'react';
import { Input, Button, Spin } from 'antd';
import { colors } from '../theme';
import { sendChatMessage, transcribeAudio, speakText, cancelOrder } from '../utils';

const GREETING =
  "Hi! I'm the CityDrop assistant. Ask me about one of your orders, get a quote for a new delivery, or ask how CityDrop works. You can also tap the mic to talk instead of typing.";

// Feature 4 (AI Customer Support). Talks to POST /chat, which is scoped to
// whichever account is logged in (session cookie) — this page never sends a
// user id itself. It can only look up orders, never cancel or change one
// directly — see ChatService's system prompt on the backend for why
// suggest_cancel_order is a confirm-first shortcut, not a direct action.
class SupportPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      messages: [{ role: 'assistant', content: GREETING }],
      inputValue: '',
      sending: false,
      recording: false,
    };
    this.scrollRef = React.createRef();
    this.audioRef = React.createRef();
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.messages.length !== this.state.messages.length) {
      const el = this.scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }

  componentWillUnmount() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  // Shared by typed sends and voice sends alike — text is already decided by
  // the time this runs (either the input box's value, or what
  // transcribeAudio handed back). speakReply controls whether the answer
  // gets read aloud afterward: only for turns that started as voice, never
  // for typed ones, so typing never triggers unexpected audio.
  sendMessage = async (text, speakReply) => {
    if (!text || this.state.sending) return;

    // history is every turn before this one — the backend has no memory of
    // its own, so the full conversation rides along on every request.
    const history = this.state.messages.map((m) => ({ role: m.role, content: m.content }));

    this.setState((prev) => ({
      messages: [...prev.messages, { role: 'user', content: text }],
      inputValue: '',
      sending: true,
    }));

    try {
      const { reply, suggestCreateOrder, offerHumanHelp, suggestCancelOrderId } =
        await sendChatMessage(text, history);
      this.setState((prev) => ({
        messages: [
          ...prev.messages,
          { role: 'assistant', content: reply, suggestCreateOrder, offerHumanHelp, suggestCancelOrderId },
        ],
        sending: false,
      }));
      if (speakReply) this.playReply(reply);
    } catch (err) {
      this.setState((prev) => ({
        messages: [
          ...prev.messages,
          { role: 'error', content: err.message || 'Something went wrong — please try again.' },
        ],
        sending: false,
      }));
    }
  };

  handleSend = () => {
    this.sendMessage(this.state.inputValue.trim(), false);
  };

  playReply = async (text) => {
    try {
      const audioBlob = await speakText(text);
      if (!audioBlob) return; // mock mode has no audio to synthesize
      const url = URL.createObjectURL(audioBlob);
      const el = this.audioRef.current;
      if (el) {
        el.src = url;
        // Autoplay can be blocked by the browser without a prior user
        // gesture — the reply text is already shown either way, so a failed
        // play() here is silently non-fatal.
        el.play().catch(() => {});
      }
    } catch (err) {
      // A voice-reply failure shouldn't undo the (already-successful) text
      // reply that's already on screen.
    }
  };

  handleMicClick = async () => {
    if (this.state.recording) {
      this.mediaRecorder.stop();
      return;
    }

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      this.setState((prev) => ({
        messages: [
          ...prev.messages,
          {
            role: 'error',
            content: "Couldn't access the microphone — check your browser's permission for this site.",
          },
        ],
      }));
      return;
    }

    this.audioChunks = [];
    this.mediaRecorder = new MediaRecorder(stream);
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.audioChunks.push(e.data);
    };
    this.mediaRecorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      this.setState({ recording: false, sending: true });
      try {
        const text = await transcribeAudio(audioBlob);
        if (text && text.trim()) {
          // setState is async -- reading this.state.sending right after
          // calling setState({sending: false}) can still see the old `true`
          // (sendMessage's own guard checks it and would bail out silently).
          // The setState callback runs only once the update has actually
          // landed, so sendMessage sees the real, current value.
          this.setState({ sending: false }, () => {
            this.sendMessage(text.trim(), true);
          });
        } else {
          this.setState({ sending: false });
          // A successful-but-empty transcription (too short/quiet a clip) is
          // silent otherwise — nothing thrown, nothing to send — which reads
          // as "broken" rather than "didn't hear anything."
          this.setState((prev) => ({
            messages: [
              ...prev.messages,
              {
                role: 'error',
                content: "I didn't catch that — try holding the mic a little longer and speaking clearly.",
              },
            ],
          }));
        }
      } catch (err) {
        this.setState((prev) => ({
          sending: false,
          messages: [
            ...prev.messages,
            { role: 'error', content: err.message || "Couldn't transcribe that — please try again." },
          ],
        }));
      }
    };

    this.mediaRecorder.start();
    this.setState({ recording: true });
  };

  handleCancelOrder = async (orderId) => {
    if (!window.confirm("Cancel order #" + orderId + "? This can't be undone.")) return;
    try {
      const order = await cancelOrder(orderId);
      this.setState((prev) => ({
        messages: [
          ...prev.messages,
          {
            role: 'assistant',
            content:
              'Order #' +
              orderId +
              ' has been cancelled. ' +
              (order.refundEligible
                ? "You're eligible for a refund."
                : 'This order was too far along to be refund-eligible.'),
          },
        ],
      }));
    } catch (err) {
      this.setState((prev) => ({
        messages: [
          ...prev.messages,
          { role: 'error', content: err.message || "Couldn't cancel that order — please try again." },
        ],
      }));
    }
  };

  render() {
    const { messages, inputValue, sending, recording } = this.state;

    return (
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <a
          onClick={() => this.props.navigate('/')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 28,
            cursor: 'pointer',
            fontWeight: 600,
            color: '#4b5563',
          }}
        >
          <span style={{ fontSize: 20, lineHeight: 1 }}>&larr;</span> Back to Home
        </a>
        <h2
          style={{
            marginTop: 0,
            color: colors.navy,
            fontWeight: 700,
            fontSize: 24,
            marginBottom: 24,
          }}
        >
          Support
        </h2>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid ' + colors.border,
            borderRadius: 16,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            ref={this.scrollRef}
            style={{
              height: 420,
              overflowY: 'auto',
              padding: '20px 20px 4px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {messages.map((m, i) => (
              <ChatBubble
                key={i}
                role={m.role}
                content={m.content}
                showCreateOrder={m.suggestCreateOrder}
                onCreateOrder={() => this.props.navigate('/order')}
                offerHumanHelp={m.offerHumanHelp}
                cancelOrderId={m.suggestCancelOrderId}
                onCancelOrder={this.handleCancelOrder}
              />
            ))}
            {sending && (
              <div style={{ alignSelf: 'flex-start', padding: '4px 4px 12px' }}>
                <Spin size="small" />
              </div>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              gap: 10,
              padding: 16,
              borderTop: '1px solid ' + colors.border,
            }}
          >
            <Input
              placeholder="Ask about an order…"
              value={inputValue}
              disabled={sending || recording}
              onChange={(e) => this.setState({ inputValue: e.target.value })}
              onPressEnter={this.handleSend}
            />
            <Button
              onClick={this.handleMicClick}
              disabled={sending}
              danger={recording}
              title={recording ? 'Stop recording' : 'Talk instead of typing'}
              style={{ minWidth: 44 }}
            >
              {recording ? '■' : '🎤'}
            </Button>
            <Button
              type="primary"
              onClick={this.handleSend}
              disabled={sending || recording || !inputValue.trim()}
            >
              Send
            </Button>
          </div>
        </div>
        {/* Feature 4, voice: hidden player for TTS replies — src is set and
            played from playReply() above rather than rendered per-message,
            since only the most recent reply should ever be spoken. */}
        <audio ref={this.audioRef} style={{ display: 'none' }} />
      </div>
    );
  }
}

function ChatBubble({
  role,
  content,
  showCreateOrder,
  onCreateOrder,
  offerHumanHelp,
  cancelOrderId,
  onCancelOrder,
}) {
  const isUser = role === 'user';
  const isError = role === 'error';

  return (
    <div style={{ alignSelf: isUser ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
      <div
        style={{
          padding: '10px 14px',
          borderRadius: 14,
          fontSize: 14,
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          background: isUser ? colors.navy : isError ? '#fef2f2' : colors.iceBg,
          color: isUser ? '#ffffff' : isError ? '#b91c1c' : colors.text,
        }}
      >
        {content}
      </div>
      {showCreateOrder && (
        <Button
          type="primary"
          size="small"
          onClick={onCreateOrder}
          style={{ marginTop: 8, backgroundColor: colors.navy, border: 'none' }}
        >
          Create order &rarr;
        </Button>
      )}
      {cancelOrderId != null && (
        <Button
          danger
          size="small"
          onClick={() => onCancelOrder(cancelOrderId)}
          style={{ marginTop: 8 }}
        >
          Cancel order #{cancelOrderId} &rarr;
        </Button>
      )}
      {offerHumanHelp && (
        <div
          style={{
            marginTop: 8,
            padding: '8px 12px',
            borderRadius: 10,
            background: '#fffbeb',
            border: '1px solid #fde68a',
            fontSize: 13,
            color: '#92400e',
          }}
        >
          Still stuck? Reach a person at{' '}
          <a href="mailto:support@citydrop.com" style={{ color: '#92400e', fontWeight: 600 }}>
            support@citydrop.com
          </a>
        </div>
      )}
    </div>
  );
}

export default SupportPage;
