import { useState } from "react";
import { createTicket } from "../../../../api/ticketApi";

export default function CreateTicketModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "EQUIPMENT",
    priority: "MEDIUM",
    resourceId: "",
  });

  const [files, setFiles] = useState([]);

  const handleSubmit = async () => {
  try {
    const formData = new FormData();

    // create ticketData 
    const ticketData = {
      ...form,
      resourceId: form.resourceId ? Number(form.resourceId) : null,
    };

    // send as STRING 
    formData.append("ticket", JSON.stringify(ticketData));

    // files already array
    const selectedFiles = files.slice(0, 3);

    selectedFiles.forEach((file) => {
      formData.append("files", file);
    });

    // DEBUG 
    console.log("FILES:", selectedFiles);

    await createTicket(formData);

    onSuccess();
    onClose();
  } catch (err) {
    console.error(err);
    alert("Failed to create ticket");
  }
};

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
      <div className="bg-white w-[500px] p-6 rounded-xl shadow-lg">

        {/* HEADER */}
        <div className="flex justify-between mb-4">
          <h2 className="text-xl font-bold">Report Issue</h2>
          <button onClick={onClose}>✖</button>
        </div>

        {/* TITLE */}
        <input
          placeholder="Title"
          className="w-full border p-2 mb-3 rounded"
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />

        {/* DESCRIPTION */}
        <textarea
          placeholder="Description"
          className="w-full border p-2 mb-3 rounded"
          onChange={(e) =>
            setForm({ ...form, description: e.target.value })
          }
        />

        {/* CATEGORY */}
        <select
          className="w-full border p-2 mb-3 rounded"
          onChange={(e) =>
            setForm({ ...form, category: e.target.value })
          }
        >
          <option value="EQUIPMENT">Equipment</option>
          <option value="NETWORK">Network</option>
          <option value="SOFTWARE">Software</option>
        </select>

        {/* PRIORITY */}
        <select
          className="w-full border p-2 mb-3 rounded"
          onChange={(e) =>
            setForm({ ...form, priority: e.target.value })
          }
        >
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>

        {/* RESOURCE ID */}
        <input
          placeholder="Resource ID"
          type="number"
          className="w-full border p-2 mb-3 rounded"
          onChange={(e) =>
            setForm({ ...form, resourceId: e.target.value })
          }
        />

        {/* FILE UPLOAD */}
        <input
          type="file"
          multiple
          className="mb-3"
          onChange={(e) => setFiles(e.target.files)}
        />
        <p className="text-xs text-gray-500 mb-3">
          Max 3 images allowed
        </p>

        {/* BUTTON */}
        <button
          onClick={handleSubmit}
          className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700"
        >
          Submit Ticket
        </button>
      </div>
    </div>
  );
}