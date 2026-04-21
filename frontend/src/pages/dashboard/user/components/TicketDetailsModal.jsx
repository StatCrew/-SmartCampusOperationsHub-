import { useEffect, useState } from "react";
import { getComments, addComment } from "../../../../api/ticketApi";

export default function TicketDetailsModal({ ticket, onClose }) {
  const [comments, setComments] = useState([]);
  const [message, setMessage] = useState("");

  // fetch comments
  const fetchComments = async () => {
    try {
      const data = await getComments(ticket.id);
      setComments(data);
    } catch (err) {
      console.error(err);
    }
  };

  // load when modal opens
  useEffect(() => {
    fetchComments();
  }, []);

  // add comment
  const handleSend = async () => {
    if (!message) return;

    await addComment(ticket.id, message);
    setMessage("");
    fetchComments();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
      <div className="bg-white w-[600px] p-6 rounded-xl shadow-lg">

        <div className="flex justify-between mb-4">
          <h2 className="text-xl font-bold">{ticket.title}</h2>
          <button onClick={onClose}>✖</button>
        </div>

        <p className="text-gray-600 mb-4">{ticket.description}</p>

        {ticket.attachments?.length > 0 && (
          <div className="flex gap-2 mb-4">
            {ticket.attachments.map((url, i) => (
              <img key={i} src={url} className="w-20 rounded" />
            ))}
          </div>
        )}

        <div className="border-t pt-3 mb-3 max-h-40 overflow-y-auto">
          {comments.map((c) => (
            <div key={c.id} className="mb-2">
              <p className="text-sm">
                <span className="font-semibold">{c.createdBy}:</span>{" "}
                {c.message}
              </p>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add comment..."
            className="flex-1 border px-3 py-2 rounded"
          />
          <button
            onClick={handleSend}
            className="bg-indigo-600 text-white px-4 rounded"
          >
            Send
          </button>
        </div>

      </div>
    </div>
  );
}