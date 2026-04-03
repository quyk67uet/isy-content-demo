"use client";

import React, { useState } from "react";
import QuestionCard from "./QuestionCard";
import { type DiagramData } from "@/app/components/GeometryRenderer";

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
  diagram_data?: DiagramData;
}

type QuestionDataSource = "array" | "questions" | "data" | null;

export default function QuestionViewer() {
  const [jsonInput, setJsonInput] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState("");
  const [, setParsedRoot] = useState<unknown>(null);
  const [dataSource, setDataSource] = useState<QuestionDataSource>(null);
  const [editLabelsMode, setEditLabelsMode] = useState(false);

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
        setDataSource("array");
      } else if (parsed.questions && Array.isArray(parsed.questions)) {
        questionsArray = parsed.questions;
        setDataSource("questions");
      } else if (parsed.data && Array.isArray(parsed.data)) {
        questionsArray = parsed.data;
        setDataSource("data");
      } else {
        setDataSource(null);
        setParsedRoot(null);
        throw new Error("Không tìm thấy mảng questions trong JSON");
      }

      setQuestions(questionsArray);
      setParsedRoot(parsed);
    } catch (err) {
      setError(
        `Lỗi parse JSON: ${err instanceof Error ? err.message : "Unknown error"}`
      );
      setQuestions([]);
      setParsedRoot(null);
      setDataSource(null);
    }
  };

  const updateJsonTextFromRoot = (root: unknown) => {
    setJsonInput(JSON.stringify(root, null, 2));
  };

  const handleQuestionDiagramDataChange = (
    questionIndex: number,
    nextDiagramData: DiagramData
  ) => {
    setQuestions((prev) =>
      prev.map((question, index) =>
        index === questionIndex
          ? { ...question, diagram_data: nextDiagramData }
          : question
      )
    );

    setParsedRoot((previousRoot: unknown) => {
      if (!previousRoot || !dataSource) {
        return previousRoot;
      }

      const rootCopy = JSON.parse(JSON.stringify(previousRoot));
      let targetArray: Question[] | null = null;

      if (dataSource === "array" && Array.isArray(rootCopy)) {
        targetArray = rootCopy as Question[];
      } else if (
        dataSource === "questions" &&
        typeof rootCopy === "object" &&
        rootCopy !== null &&
        Array.isArray((rootCopy as { questions?: unknown }).questions)
      ) {
        targetArray = (rootCopy as { questions: Question[] }).questions;
      } else if (
        dataSource === "data" &&
        typeof rootCopy === "object" &&
        rootCopy !== null &&
        Array.isArray((rootCopy as { data?: unknown }).data)
      ) {
        targetArray = (rootCopy as { data: Question[] }).data;
      }

      if (!targetArray || !targetArray[questionIndex]) {
        return previousRoot;
      }

      targetArray[questionIndex] = {
        ...targetArray[questionIndex],
        diagram_data: nextDiagramData,
      };

      updateJsonTextFromRoot(rootCopy);
      return rootCopy;
    });
  };

  const handleClear = () => {
    setJsonInput("");
    setQuestions([]);
    setError("");
    setParsedRoot(null);
    setDataSource(null);
    setEditLabelsMode(false);
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">
            Questions Viewer
          </h2>
          <div className="flex items-center gap-2">
            {questions.some((question) => question.diagram_data) && (
              <button
                onClick={() => setEditLabelsMode((prev) => !prev)}
                className={`px-4 py-2 rounded-lg transition-colors text-white ${
                  editLabelsMode
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {editLabelsMode ? "Tắt Edit Labels" : "Edit Labels"}
              </button>
            )}
            {jsonInput && (
              <button
                onClick={handleClear}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
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
          {editLabelsMode && (
            <div className="mt-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              Chế độ Edit Labels đang bật: kéo trực tiếp nhãn và điểm trên hình. JSON trong ô này sẽ được update ngay sau khi thả chuột.
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
            <QuestionCard
              key={index}
              question={question}
              index={index}
              editableLabels={editLabelsMode}
              onDiagramDataChange={(nextDiagramData) =>
                handleQuestionDiagramDataChange(index, nextDiagramData)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

