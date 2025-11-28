"use client";

import { useState } from "react";
import QuestionViewer from "@/components/QuestionViewer";
import FlashcardViewer from "@/components/FlashcardViewer";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"questions" | "flashcards">(
    "questions"
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                E-Learning Content Validator
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Công cụ validate và hiển thị nội dung LaTeX cho đội Content
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg">
                📚
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="bg-white rounded-lg shadow-md p-2 inline-flex gap-2">
          <button
            onClick={() => setActiveTab("questions")}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === "questions"
                ? "bg-blue-500 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <span className="flex items-center gap-2">
              <span>📝</span>
              <span>Questions</span>
            </span>
          </button>
          <button
            onClick={() => setActiveTab("flashcards")}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === "flashcards"
                ? "bg-purple-500 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <span className="flex items-center gap-2">
              <span>🎴</span>
              <span>Flashcards</span>
            </span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
          {/* Instructions */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              📖 Hướng dẫn sử dụng
            </h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>
                Chọn tab <strong>Questions</strong> hoặc{" "}
                <strong>Flashcards</strong> tương ứng với loại dữ liệu bạn muốn
                validate
              </li>
              <li>
                Copy nội dung từ file JSON (
                <code className="bg-blue-100 px-1 rounded">
                  x_questions.json
                </code>{" "}
                hoặc{" "}
                <code className="bg-blue-100 px-1 rounded">
                  x_flashcards.json
                </code>
                )
              </li>
              <li>
                Paste vào ô textarea bên dưới (Ctrl+V hoặc click chuột phải →
                Paste)
              </li>
              <li>
                Nội dung LaTeX sẽ được render tự động và hiển thị đúng định
                dạng
              </li>
              <li>
                Kiểm tra kỹ các công thức toán học, ký tự đặc biệt, và nội dung
                hiển thị
              </li>
            </ul>
          </div>

          {/* Content Viewer */}
          {activeTab === "questions" ? (
            <QuestionViewer />
          ) : (
            <FlashcardViewer />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-12">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-600 text-sm">
            Made with ❤️ for Content Team | E-Learning Platform
          </p>
          <p className="text-gray-500 text-xs mt-2">
            Backend: Frappe | Frontend: Next.js | LaTeX Rendering: KaTeX
          </p>
        </div>
      </footer>
    </div>
  );
}
