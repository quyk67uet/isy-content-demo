"use client";

import React from "react";
import { parseLatex } from "@/lib/utils";
import GeometryRenderer, { type DiagramData } from "@/app/components/GeometryRenderer";

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

interface QuestionCardProps {
  question: Question;
  index: number;
}

export default function QuestionCard({ question, index }: QuestionCardProps) {
  const isMultipleChoice = question.question_type === "Trắc nghiệm";

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-l-4 border-blue-500">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full">
              Câu {index + 1}
            </span>
            <span className="inline-block bg-purple-100 text-purple-800 text-xs font-semibold px-3 py-1 rounded-full">
              {question.question_type}
            </span>
            <span className="inline-block bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">
              {question.difficulty}
            </span>
          </div>
          <div className="text-xs text-gray-500 mb-2">
            Learning Object: {question.learning_object}
          </div>
        </div>
      </div>

      {/* Question Text */}
      <div className="mb-4">
        <div className="text-lg font-medium text-gray-900 mb-2">Câu hỏi:</div>
        <div className="text-gray-800 leading-relaxed">
          {parseLatex(question.question_text)}
        </div>
        {question.diagram_data && <GeometryRenderer data={question.diagram_data} />}
      </div>

      {/* Choices (for multiple choice) */}
      {isMultipleChoice && question.choices && (
        <div className="mb-4">
          <div className="text-md font-medium text-gray-900 mb-2">
            Các lựa chọn:
          </div>
          <div className="space-y-2">
            {question.choices.map((choice) => (
              <div
                key={choice.choice_id}
                className={`p-3 rounded-lg border-2 transition-all ${
                  choice.choice_id === question.answer
                    ? "bg-green-50 border-green-500"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`font-bold min-w-[24px] ${
                      choice.choice_id === question.answer
                        ? "text-green-700"
                        : "text-gray-700"
                    }`}
                  >
                    {choice.choice_id}.
                  </span>
                  <div className="flex-1 text-gray-800">
                    {parseLatex(choice.content)}
                  </div>
                  {choice.choice_id === question.answer && (
                    <span className="text-green-600 font-semibold text-sm">
                      ✓ Đáp án đúng
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Answer (for essay questions) */}
      {!isMultipleChoice && (
        <div className="mb-4">
          <div className="text-md font-medium text-gray-900 mb-2">Đáp án:</div>
          <div className="p-3 bg-green-50 border-2 border-green-200 rounded-lg text-gray-800">
            {parseLatex(question.answer)}
          </div>
        </div>
      )}

      {/* Suggested Solution */}
      {question.suggested_solution && (
        <div className="mt-4">
          <div className="text-md font-medium text-gray-900 mb-2">
            Lời giải chi tiết:
          </div>
          <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg text-gray-800 leading-relaxed">
            {parseLatex(question.suggested_solution)}
          </div>
        </div>
      )}
    </div>
  );
}

