import { useState } from 'react'
import axios from 'axios'
import * as XLSX from 'xlsx'
import './App.css'

function App() {
  const [msg, setMsg] = useState('')
  const [status, setStatus] = useState(false)
  const [files, setFiles] = useState([])
  const [emailList, setEmailList] = useState([])
  const [fileError, setFileError] = useState('')

  function addFiles(selectedFiles) {
    if (!selectedFiles.length) return
    setFiles((currentFiles) => [...currentFiles, ...selectedFiles])

    const spreadsheet = selectedFiles.find((file) => /\.(xlsx|xls|csv)$/i.test(file.name))
    if (!spreadsheet) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target.result, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const emails = XLSX.utils.sheet_to_json(sheet, { header: 'A' })
          .map((row) => String(row.A || '').trim())
          .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        setEmailList(emails)
        setFileError(emails.length ? '' : 'No valid email addresses found in column A.')
      } catch (error) {
        console.error('Could not read spreadsheet:', error)
        alert('Could not read the selected spreadsheet')
      }
    }
    reader.readAsArrayBuffer(spreadsheet)
  }

  function handleFileChange(event) {
    addFiles(Array.from(event.currentTarget.files || []))
    event.currentTarget.value = ''
  }

  function removeFile(indexToRemove) {
    setFiles((currentFiles) => currentFiles.filter((_, index) => index !== indexToRemove))
  }

   
 
const send = async () => {
  if (!msg.trim()) {
    alert("Please enter your message");
    return;
  }

  if (emailList.length === 0) {
    alert("Please upload a file with valid emails");
    return;
  }

  setStatus(true);

  try {
    const res = await axios.post(
      `${import.meta.env.VITE_API_URL}/sendemail`,
      {
        msg: msg,
        emails: emailList,
      }
    );

    alert(res.data.message);
    setMsg('');

  } catch (error) {
    console.error("Email Error:", error.response?.data || error.message);

    alert(error.response?.data?.message || "Email sending failed");

  } finally {
    setStatus(false);
  }
};


  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-5">
      <main className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-orange-500">BulkMail</h1>
          <p className="text-gray-500 mt-2">Send emails with attachments easily</p>
        </header>

        <section className="mb-6">
          <label htmlFor="message" className="block text-gray-700 font-semibold mb-3">
            Your Message
          </label>
          <textarea
            id="message"
            value={msg}
            onChange={(event) => setMsg(event.target.value)}
            placeholder="Type your email message here..."
            rows={7}
            className="w-full border border-gray-300 rounded-xl p-4 outline-none focus:ring-2 focus:ring-orange-400 resize-none text-gray-700"
          />
        </section>

        <section
          className="border-2 border-dashed border-orange-400 rounded-xl p-8 text-center bg-orange-50"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            addFiles(Array.from(event.dataTransfer.files))
          }}
        >
          <div className="text-5xl mb-4">📁</div>
          <h2 className="text-lg font-semibold text-gray-800">Drag &amp; Drop your files here</h2>
          <p className="text-sm text-gray-500 mt-2">Drop your attachments here to upload</p>
          <label
            htmlFor="attachment-input"
            className="mt-5 inline-block cursor-pointer bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            Select Files
          </label>
          <input
            id="attachment-input"
            type="file"
            multiple
            onChange={handleFileChange}
            className="sr-only"
          />
        </section>

        <p className="mt-4 text-gray-700">Total Emails: {emailList.length}</p>
        {fileError && <p className="mt-2 text-sm text-red-600">{fileError}</p>}
        <section className="mt-6">
          <h3 className="font-semibold text-gray-700 mb-3">Selected Files ({files.length})</h3>
          <div className="bg-gray-100 p-4 rounded-lg text-sm text-center">
            {files.length ? (
              <ul className="space-y-2 text-gray-700">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${file.lastModified}-${index}`}
                    className="flex items-center justify-between gap-4"
                  >
                    <span className="truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      aria-label={`Remove ${file.name}`}
                      className="shrink-0 font-semibold text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : <span className="text-gray-400">No files selected</span>}
          </div>
        </section>

        <button
          type="button"
          onClick={send}
          disabled={status}
          className="w-full mt-7 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold py-4 rounded-xl transition shadow-lg"
        >
          {status ? 'Sending...' : 'Send Email'}
        </button>
        <p className="text-center text-gray-400 text-xs mt-5">
          BulkMail - Simple and Easy Email Management
        </p>
      </main>
    </div>
  )
}

export default App
