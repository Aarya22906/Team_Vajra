
from typing import Literal
from pydantic import BaseModel, Field, ConfigDict


class Slide(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    title: str
    bullets: list[str] = Field(max_length=5)
    purpose: str
    diagram_path: str | None = None


class CodeSnippet(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    title: str
    language: str = "java"
    code: str
    kind: Literal["runnable", "fragment", "config"]
    expected_output: str
    slide_id: str | None = None
    verification_status: Literal[
        "unverified", "passed", "failed"
    ] = "unverified"


class Exercise(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    title: str
    problem_statement: str
    test_code: str
    reference_solution: str
    naive_solution: str
    snippet_id: str | None = None


class QuizQuestion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    question: str
    options: list[str] = Field(min_length=2, max_length=6)
    correct_answer: str
    explanation: str


class CoursePackage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    course_title: str
    level: Literal["beginner", "intermediate", "advanced"]
    duration_minutes: int = Field(gt=0)
    slides: list[Slide]
    snippets: list[CodeSnippet]
    exercises: list[Exercise]
    quiz: list[QuizQuestion]
    trainer_notes: dict[str, str] = Field(default_factory=dict)
    cheat_sheet: list[str] = Field(default_factory=list)
