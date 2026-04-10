import React, { useState, useMemo } from "react";
import { contactSchema, type Contact } from "./schema";

type FormErrors = Partial<Record<keyof Contact, string>>;

export default function App() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "general" as Contact["subject"],
    message: "",
    priority: "medium" as Contact["priority"],
    subscribe: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submissions, setSubmissions] = useState<Contact[]>([]);
  const [filter, setFilter] = useState<string>("all");

  const filteredSubmissions = useMemo(() => {
    if (filter === "all") return submissions;
    return submissions.filter((s) => s.priority === filter);
  }, [submissions, filter]);

  const stats = useMemo(() => ({
    total: submissions.length,
    high: submissions.filter((s) => s.priority === "high").length,
    subscribed: submissions.filter((s) => s.subscribe).length,
  }), [submissions]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = contactSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: FormErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof Contact;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSubmissions((prev) => [...prev, result.data]);
    setForm({ name: "", email: "", subject: "general", message: "", priority: "medium", subscribe: false });
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Contact Form</h1>

        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 mb-8 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input name="name" value={form.name} onChange={handleChange}
              className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input name="email" type="email" value={form.email} onChange={handleChange}
              className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Subject</label>
              <select name="subject" value={form.subject} onChange={handleChange}
                className="mt-1 block w-full rounded border-gray-300 shadow-sm p-2 border">
                <option value="general">General</option>
                <option value="support">Support</option>
                <option value="billing">Billing</option>
                <option value="partnership">Partnership</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Priority</label>
              <select name="priority" value={form.priority} onChange={handleChange}
                className="mt-1 block w-full rounded border-gray-300 shadow-sm p-2 border">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Message</label>
            <textarea name="message" value={form.message} onChange={handleChange} rows={4}
              className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" />
            {errors.message && <p className="mt-1 text-sm text-red-600">{errors.message}</p>}
          </div>

          <div className="flex items-center">
            <input name="subscribe" type="checkbox" checked={form.subscribe} onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-blue-600" />
            <label className="ml-2 text-sm text-gray-700">Subscribe to newsletter</label>
          </div>

          <button type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 font-medium">
            Submit
          </button>
        </form>

        {submissions.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Submissions ({stats.total})</h2>
              <div className="flex gap-2 text-sm">
                <span className="text-red-600 font-medium">{stats.high} high</span>
                <span className="text-green-600 font-medium">{stats.subscribed} subscribed</span>
              </div>
            </div>
            <div className="flex gap-2 mb-4">
              {["all", "low", "medium", "high"].map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded text-sm ${filter === f ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}>
                  {f}
                </button>
              ))}
            </div>
            <ul className="divide-y divide-gray-200">
              {filteredSubmissions.map((s, i) => (
                <li key={i} className="py-3">
                  <div className="flex justify-between">
                    <span className="font-medium">{s.name}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      s.priority === "high" ? "bg-red-100 text-red-800" :
                      s.priority === "medium" ? "bg-yellow-100 text-yellow-800" :
                      "bg-green-100 text-green-800"
                    }`}>{s.priority}</span>
                  </div>
                  <p className="text-sm text-gray-500">{s.email} — {s.subject}</p>
                  <p className="text-sm mt-1">{s.message}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
