"use client";

import React, { useState } from "react";
import QuestionCard from "./QuestionCard";

interface Choice {
  choice_id: string;
  content: string;
}

interface Question {
  question_type: string;
  difficulty: string;
  learning_object: string;
  question_text: string;
  choices?: Choice[] | null;
  answer: string;
  suggested_solution?: string;
}

export default function QuestionViewer() {
  const [jsonInput, setJsonInput] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState("");

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    setJsonInput(pastedText);
    parseJson(pastedText);
  };

  const parseJson = (text: string) => {
    try {
      setError("");
      const parsed = JSON.parse(text);
      
      // Check if it's an array or object with questions property
      let questionsArray: Question[] = [];
      if (Array.isArray(parsed)) {
        questionsArray = parsed;
      } else if (parsed.questions && Array.isArray(parsed.questions)) {
        questionsArray = parsed.questions;
      } else if (parsed.data && Array.isArray(parsed.data)) {
        questionsArray = parsed.data;
      } else {
        throw new Error("Không tìm thấy mảng questions trong JSON");
      }

      setQuestions(questionsArray);
    } catch (err) {
      setError(
        `Lỗi parse JSON: ${err instanceof Error ? err.message : "Unknown error"}`
      );
      setQuestions([]);
    }
  };

  const handleClear = () => {
    setJsonInput("");
    setQuestions([]);
    setError("");
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">
            Questions Viewer
          </h2>
          {jsonInput && (
            <button
              onClick={handleClear}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Paste JSON data (Ctrl+V):
          </label>
          <textarea
            value={jsonInput}
            onChange={(e) => {
              setJsonInput(e.target.value);
              parseJson(e.target.value);
            }}
            onPaste={handlePaste}
            placeholder='Paste your questions JSON here... Example: [{"question_type": "Trắc nghiệm", ...}]'
            className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          />
          {error && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          {questions.length > 0 && (
            <div className="mt-2 text-sm text-green-600 font-medium">
              ✓ Đã tải {questions.length} câu hỏi
            </div>
          )}
        </div>
      </div>

      {questions.length > 0 && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Tổng quan
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {questions.length}
                </div>
                <div className="text-sm text-gray-600">Tổng số câu</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {
                    questions.filter((q) => q.question_type === "Trắc nghiệm")
                      .length
                  }
                </div>
                <div className="text-sm text-gray-600">Trắc nghiệm</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {
                    questions.filter((q) => q.question_type === "Tự luận")
                      .length
                  }
                </div>
                <div className="text-sm text-gray-600">Tự luận</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-teal-600">
                  {
                    questions.filter((q) => q.suggested_solution).length
                  }
                </div>
                <div className="text-sm text-gray-600">Có lời giải</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-blue-200">
              <div className="text-sm font-medium text-blue-800 mb-2">
                Phân loại theo độ khó:
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                {Array.from(new Set(questions.map((q) => q.difficulty)))
                  .sort()
                  .map((difficulty) => (
                    <div
                      key={difficulty}
                      className="bg-white px-3 py-2 rounded border border-blue-100 text-center"
                    >
                      <span className="font-semibold text-blue-700">
                        {questions.filter((q) => q.difficulty === difficulty).length}
                      </span>
                      <span className="text-gray-600 ml-1">{difficulty}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {questions.map((question, index) => (
            <QuestionCard key={index} question={question} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}

