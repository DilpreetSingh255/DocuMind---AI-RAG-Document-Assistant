import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000";
function App() {
  // ============================================================
  // STATE
  // ============================================================

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  // Gemini answer loading
  const [isLoading, setIsLoading] = useState(false);

  // PDF upload/indexing loading
  const [isUploading, setIsUploading] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);

  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadError, setUploadError] = useState("");

  // Auto-scroll
  const messagesEndRef = useRef(null);

  // ============================================================
  // AUTO SCROLL
  // ============================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  // ============================================================
  // NEW CONVERSATION
  // ============================================================

  const newConversation = () => {
    setMessages([]);
    setInput("");
  };

  // ============================================================
  // SUGGESTED QUESTION
  // ============================================================

  const suggestedQuestion = (question) => {
    setInput(question);
  };

  // ============================================================
  // ASK QUESTION
  // ============================================================

  const askQuestion = async () => {
    if (!input.trim() || isLoading || isUploading) {
      return;
    }

    const question = input.trim();

    // Add user message immediately
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: question,
      },
    ]);

    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(
`${API_URL}/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: question,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to get an answer."
        );
      }

      console.log("Backend response:", data);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            data.answer || "No answer received.",
          sources: data.sources || [],
        },
      ]);
    } catch (error) {
      console.error("Chat error:", error);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I couldn't process your question right now. Please make sure the DocuMind backend is running and try again.",
          sources: [],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // ENTER KEY
  // ============================================================

  const handleKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      askQuestion();
    }
  };

  // ============================================================
  // FILE UPLOAD
  // ============================================================

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    // Validate PDF
    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setUploadError("Please select a PDF file.");
      setUploadStatus("");
      setSelectedFile(null);
      return;
    }

    // Reset states
    setSelectedFile(file);
    setUploadError("");
    setUploadStatus("Uploading and indexing...");
    setIsUploading(true);

    try {
      const formData = new FormData();

      formData.append("file", file);

      const response = await fetch(
`${API_URL}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to upload PDF."
        );
      }

      console.log(
        "Upload successful:",
        data
      );

      // New document = new conversation
      setMessages([]);

      setUploadStatus("Document ready");
      setUploadError("");
    } catch (error) {
      console.error(
        "Upload error:",
        error
      );

      setUploadStatus("");

      setUploadError(
        error.message ||
          "Failed to upload PDF. Please try again."
      );

      setSelectedFile(null);
    } finally {
      setIsUploading(false);

      // Allows the same PDF to be selected again
      event.target.value = "";
    }
  };

  // ============================================================
  // MARKDOWN COMPONENTS
  // ============================================================

  const markdownComponents = {
    h1: ({ children }) => (
      <h1 className="text-2xl font-semibold text-white mt-2 mb-5">
        {children}
      </h1>
    ),

    h2: ({ children }) => (
      <h2 className="text-xl font-semibold text-white mt-7 mb-4">
        {children}
      </h2>
    ),

    h3: ({ children }) => (
      <h3 className="text-lg font-semibold text-white mt-6 mb-3">
        {children}
      </h3>
    ),

    p: ({ children }) => (
      <p className="text-gray-300 leading-7 mb-4 last:mb-0">
        {children}
      </p>
    ),

    strong: ({ children }) => (
      <strong className="font-semibold text-white">
        {children}
      </strong>
    ),

    em: ({ children }) => (
      <em className="text-gray-200">
        {children}
      </em>
    ),

    ul: ({ children }) => (
      <ul className="list-disc ml-6 my-4 space-y-2 marker:text-violet-400">
        {children}
      </ul>
    ),

    ol: ({ children }) => (
      <ol className="list-decimal ml-6 my-4 space-y-2 marker:text-violet-400">
        {children}
      </ol>
    ),

    li: ({ children }) => (
      <li className="text-gray-300 leading-7 pl-1">
        {children}
      </li>
    ),

    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-violet-500/50 pl-5 my-5 text-gray-400 italic">
        {children}
      </blockquote>
    ),

    hr: () => (
      <hr className="my-7 border-white/[0.08]" />
    ),

    code: ({
      className,
      children,
      ...props
    }) => {
      const isInline = !className;

      if (isInline) {
        return (
          <code
            className="px-1.5 py-0.5 rounded-md bg-white/[0.07] text-violet-300 text-[13px]"
            {...props}
          >
            {children}
          </code>
        );
      }

      return (
        <pre className="my-5 overflow-x-auto rounded-xl border border-white/[0.08] bg-black/30 p-5">
          <code className="text-sm text-gray-300">
            {children}
          </code>
        </pre>
      );
    },

    table: ({ children }) => (
      <div className="my-6 overflow-x-auto rounded-xl border border-white/[0.08]">
        <table className="w-full text-sm border-collapse">
          {children}
        </table>
      </div>
    ),

    thead: ({ children }) => (
      <thead className="bg-white/[0.04]">
        {children}
      </thead>
    ),

    th: ({ children }) => (
      <th className="px-4 py-3 text-left font-semibold text-white border-b border-white/[0.08]">
        {children}
      </th>
    ),

    td: ({ children }) => (
      <td className="px-4 py-3 text-gray-300 border-b border-white/[0.06]">
        {children}
      </td>
    ),
  };

  // ============================================================
  // DOCUMENT READY STATE
  // ============================================================

  const documentReady =
    selectedFile &&
    uploadStatus === "Document ready";

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="min-h-screen bg-[#07080d] text-white flex">

      {/* ========================================================
          SIDEBAR
      ======================================================== */}

      <aside className="w-[350px] min-h-screen border-r border-white/[0.07] bg-[#090a0f] flex flex-col">

        {/* LOGO */}

        <div className="px-7 pt-7">

          <div className="flex items-center gap-4">

            <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg shadow-violet-900/20">

              <img
                src="/documind-logo.png"
                alt="DocuMind"
                className="w-full h-full object-cover"
              />

            </div>

            <div>

              <h1 className="text-2xl font-semibold tracking-tight">
                DocuMind
              </h1>

              <p className="text-[11px] tracking-[0.25em] text-gray-500 mt-1">
                AI DOCUMENT ASSISTANT
              </p>

            </div>

          </div>

        </div>


        {/* NEW CONVERSATION */}

        <div className="px-5 mt-9">

          <button
            onClick={newConversation}
            disabled={
              isLoading ||
              isUploading
            }
            className="w-full h-14 rounded-2xl border border-white/[0.09] bg-white/[0.02] hover:bg-white/[0.05] disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-3 text-gray-200"
          >

            <span className="text-violet-400 text-xl">
              +
            </span>

            <span className="text-[15px]">
              New conversation
            </span>

          </button>

        </div>


        {/* DOCUMENT UPLOAD */}

        <div className="px-5 mt-12">

          <div className="text-[11px] tracking-[0.25em] text-gray-600 mb-5">
            YOUR DOCUMENTS
          </div>


          <label
            className={`group block ${
              isUploading
                ? "cursor-wait"
                : "cursor-pointer"
            }`}
          >

            <div className="h-60 rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.015] hover:bg-white/[0.035] transition flex flex-col items-center justify-center">

              {/* UPLOAD ICON */}

              <div className="w-14 h-14 rounded-2xl bg-violet-500/[0.08] border border-violet-500/[0.15] flex items-center justify-center mb-5">

                {isUploading ? (
                  <span className="text-violet-400 text-2xl animate-spin">
                    ◌
                  </span>
                ) : (
                  <span className="text-violet-400 text-2xl">
                    ↑
                  </span>
                )}

              </div>


              {/* TITLE */}

              <div className="font-medium text-gray-200">

                {isUploading
                  ? "Processing PDF..."
                  : "Upload PDF"}

              </div>


              {/* DESCRIPTION */}

              <div className="text-xs text-gray-600 mt-2">
                PDF files up to 200MB
              </div>


              {/* BUTTON */}

              <div
                className={`mt-5 px-5 py-2.5 rounded-xl border border-white/[0.09] bg-white/[0.03] text-gray-400 transition ${
                  isUploading
                    ? "opacity-40"
                    : "group-hover:text-white"
                }`}
              >

                {isUploading
                  ? "Indexing..."
                  : "Choose file"}

              </div>


              {/* SELECTED FILE */}

              {selectedFile && (

                <div className="mt-3 text-xs text-violet-400 max-w-[240px] truncate">

                  {selectedFile.name}

                </div>

              )}

            </div>


            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleFileChange}
              disabled={isUploading}
              className="hidden"
            />

          </label>


          {/* UPLOAD SUCCESS */}

          {uploadStatus && (

            <div className="mt-3 flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-3">

              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-sm text-emerald-400">
                ✓
              </div>

              <div className="min-w-0">

                <p className="text-xs font-medium text-emerald-400">
                  {uploadStatus}
                </p>

                {selectedFile && (

                  <p className="truncate text-[11px] text-gray-500 mt-0.5">
                    {selectedFile.name}
                  </p>

                )}

              </div>

            </div>

          )}


          {/* UPLOAD ERROR */}

          {uploadError && (

            <div className="mt-3 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-3 py-3">

              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-sm text-red-400">
                !
              </div>

              <p className="text-xs text-red-400 leading-5">
                {uploadError}
              </p>

            </div>

          )}

        </div>


        {/* SIDEBAR BOTTOM */}

        <div className="mt-auto px-7 py-6 border-t border-white/[0.06]">

          <div className="text-[10px] tracking-[0.25em] text-gray-600 mb-3">
            DOCUMENT ASSISTANT
          </div>

          <p className="text-xs text-gray-600 leading-6">
            Ask questions about your uploaded documents
            and get grounded answers.
          </p>

        </div>

      </aside>


      {/* ========================================================
          MAIN
      ======================================================== */}

      <main className="flex-1 min-w-0 flex flex-col min-h-screen">


        {/* HEADER */}

        <header className="h-[76px] border-b border-white/[0.07] flex items-center justify-between px-9">

          <div>

            <h2 className="font-semibold text-[17px]">
              Document Assistant
            </h2>

            <p className="text-xs text-gray-600 mt-1">
              Ask questions and explore your documents
            </p>

          </div>


          {/* REAL DOCUMENT STATUS */}

          <div className="flex items-center gap-3">

            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-full border ${
                isUploading
                  ? "border-amber-500/20 bg-amber-500/[0.04]"
                  : documentReady
                  ? "border-emerald-500/20 bg-emerald-500/[0.04]"
                  : "border-white/[0.08] bg-white/[0.02]"
              }`}
            >

              <span
                className={`w-2 h-2 rounded-full ${
                  isUploading
                    ? "bg-amber-400 animate-pulse"
                    : documentReady
                    ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]"
                    : "bg-gray-600"
                }`}
              />

              <span
                className={`text-xs ${
                  isUploading
                    ? "text-amber-400"
                    : documentReady
                    ? "text-emerald-400"
                    : "text-gray-500"
                }`}
              >

                {isUploading
                  ? "Indexing..."
                  : documentReady
                  ? "Document Ready"
                  : "Upload a Document"}

              </span>

            </div>


            <button
              className="w-11 h-11 rounded-xl border border-white/[0.08] hover:bg-white/[0.04] transition text-gray-500"
              title="Settings"
            >
              ⚙
            </button>

          </div>

        </header>


        {/* ======================================================
            CHAT AREA
        ====================================================== */}

        <div className="flex-1 overflow-y-auto">

          {messages.length === 0 ? (

            /* EMPTY STATE */

            <div className="min-h-[calc(100vh-76px)] flex flex-col items-center justify-center px-8 pb-32">

              <div className="w-28 h-28 rounded-3xl overflow-hidden border border-white/[0.08] shadow-2xl shadow-violet-900/10 mb-8">

                <img
                  src="/documind-logo.png"
                  alt="DocuMind"
                  className="w-full h-full object-cover"
                />

              </div>


              <h1 className="text-5xl font-semibold text-center tracking-tight">

                Your documents,

                <span className="block text-violet-400 mt-1">
                  understood.
                </span>

              </h1>


              <p className="text-gray-500 text-center max-w-2xl mt-7 leading-7">

                Upload a PDF and ask questions in natural language.
                DocuMind retrieves relevant information from your
                documents and generates grounded answers.

              </p>


              {/* SUGGESTED QUESTIONS */}

              <div className="grid grid-cols-3 gap-4 mt-12 w-full max-w-[900px]">

                <button
                  onClick={() =>
                    suggestedQuestion(
                      "Summarize this document"
                    )
                  }
                  disabled={
                    isLoading ||
                    isUploading
                  }
                  className="text-left p-6 rounded-2xl border border-white/[0.08] bg-white/[0.015] hover:bg-white/[0.035] hover:border-violet-500/20 disabled:opacity-40 transition group"
                >

                  <div className="w-8 h-8 rounded-lg overflow-hidden mb-7">

                    <img
                      src="/documind-logo.png"
                      alt=""
                      className="w-full h-full object-cover"
                    />

                  </div>

                  <div className="text-gray-400 group-hover:text-white transition">
                    Summarize this document
                  </div>

                </button>


                <button
                  onClick={() =>
                    suggestedQuestion(
                      "Find the key concepts in this document"
                    )
                  }
                  disabled={
                    isLoading ||
                    isUploading
                  }
                  className="text-left p-6 rounded-2xl border border-white/[0.08] bg-white/[0.015] hover:bg-white/[0.035] hover:border-violet-500/20 disabled:opacity-40 transition group"
                >

                  <div className="w-8 h-8 rounded-lg overflow-hidden mb-7">

                    <img
                      src="/documind-logo.png"
                      alt=""
                      className="w-full h-full object-cover"
                    />

                  </div>

                  <div className="text-gray-400 group-hover:text-white transition">
                    Find the key concepts
                  </div>

                </button>


                <button
                  onClick={() =>
                    suggestedQuestion(
                      "Explain this document in simple terms"
                    )
                  }
                  disabled={
                    isLoading ||
                    isUploading
                  }
                  className="text-left p-6 rounded-2xl border border-white/[0.08] bg-white/[0.015] hover:bg-white/[0.035] hover:border-violet-500/20 disabled:opacity-40 transition group"
                >

                  <div className="w-8 h-8 rounded-lg overflow-hidden mb-7">

                    <img
                      src="/documind-logo.png"
                      alt=""
                      className="w-full h-full object-cover"
                    />

                  </div>

                  <div className="text-gray-400 group-hover:text-white transition">
                    Explain it simply
                  </div>

                </button>

              </div>

            </div>

          ) : (

            /* MESSAGES */

            <div className="max-w-5xl mx-auto w-full px-8 py-10">

              <div className="space-y-10">

                {messages.map(
                  (message, index) => (

                    <div
                      key={index}
                      className={`flex ${
                        message.role === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >

                      {/* USER */}

                      {message.role === "user" ? (

                        <div className="max-w-[75%] rounded-2xl rounded-br-md bg-violet-600 px-5 py-3.5 text-sm text-white shadow-lg shadow-violet-900/20">

                          {message.content}

                        </div>

                      ) : (

                        /* ASSISTANT */

                        <div className="max-w-[90%] w-full">

                          {/* ASSISTANT HEADER */}

                          <div className="flex items-center gap-3 mb-4">

                            <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/[0.08]">

                              <img
                                src="/documind-logo.png"
                                alt="DocuMind"
                                className="w-full h-full object-cover"
                              />

                            </div>

                            <span className="text-sm text-gray-400">
                              DocuMind
                            </span>

                          </div>


                          {/* ANSWER */}

                          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.018] px-7 py-6">

                            <div className="text-[15px] text-gray-300">

                              <ReactMarkdown
                                remarkPlugins={[
                                  remarkGfm,
                                ]}
                                components={
                                  markdownComponents
                                }
                              >
                                {message.content}
                              </ReactMarkdown>

                            </div>


                            {/* SOURCES */}

                            {message.sources &&
                              message.sources.length > 0 && (

                                <div className="mt-7 pt-5 border-t border-white/[0.06]">

                                  <div className="text-[10px] tracking-[0.22em] uppercase text-gray-600 mb-4">
                                    Sources
                                  </div>

                                  <div className="flex flex-wrap gap-2">

                                    {message.sources.map(
                                      (
                                        source,
                                        sourceIndex
                                      ) => (

                                        <div
                                          key={
                                            sourceIndex
                                          }
                                          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:border-violet-500/20 transition"
                                        >

                                          <span className="text-violet-400 text-xs">
                                            ▣
                                          </span>

                                          <span className="text-xs text-gray-500">
                                            Page{" "}
                                            {
                                              source.page
                                            }
                                          </span>

                                        </div>

                                      )
                                    )}

                                  </div>

                                </div>

                              )}

                          </div>

                        </div>

                      )}

                    </div>

                  )
                )}


                {/* AI LOADING */}

                {isLoading && (

                  <div className="flex items-start gap-3">

                    <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/[0.08]">

                      <img
                        src="/documind-logo.png"
                        alt="DocuMind"
                        className="w-full h-full object-cover"
                      />

                    </div>

                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.018] px-6 py-5">

                      <div className="flex items-center gap-2">

                        <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" />

                        <span
                          className="w-2 h-2 rounded-full bg-violet-400 animate-bounce"
                          style={{
                            animationDelay:
                              "150ms",
                          }}
                        />

                        <span
                          className="w-2 h-2 rounded-full bg-violet-400 animate-bounce"
                          style={{
                            animationDelay:
                              "300ms",
                          }}
                        />

                      </div>

                    </div>

                  </div>

                )}


                <div
                  ref={messagesEndRef}
                  className="h-px"
                />

              </div>

            </div>

          )}

        </div>


        {/* ======================================================
            INPUT
        ====================================================== */}

        <div className="border-t border-white/[0.06] bg-[#08090e] px-8 py-5">

          <div className="max-w-5xl mx-auto">

            <div className="relative rounded-2xl border border-white/[0.09] bg-white/[0.018] focus-within:border-violet-500/30 transition">

              <textarea
                value={input}
                onChange={(event) =>
                  setInput(
                    event.target.value
                  )
                }
                onKeyDown={
                  handleKeyDown
                }
                placeholder={
                  isUploading
                    ? "Processing your document..."
                    : "Ask anything about your document..."
                }
                rows={2}
                disabled={
                  isLoading ||
                  isUploading
                }
                className="w-full resize-none bg-transparent outline-none px-5 pt-4 pb-12 text-sm text-gray-200 placeholder:text-gray-600 disabled:opacity-50"
              />


              <div className="absolute bottom-3 left-5 text-[10px] text-gray-700">
                Enter ↵ to send
              </div>


              <button
                onClick={askQuestion}
                disabled={
                  !input.trim() ||
                  isLoading ||
                  isUploading
                }
                className="absolute right-3 bottom-3 w-10 h-10 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-white/[0.05] disabled:text-gray-700 text-white transition flex items-center justify-center"
              >

                {isLoading ? (
                  <span className="animate-spin">
                    ◌
                  </span>
                ) : (
                  "↑"
                )}

              </button>

            </div>


            <p className="text-center text-[10px] text-gray-700 mt-3">
              Answers are generated from your uploaded documents.
            </p>

          </div>

        </div>

      </main>

    </div>
  );
}

export default App;