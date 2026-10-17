// Sample content in the same shape as generated content, so every screen has one code path.
import { cheatSheet, codeExamples, exercises, javaSlides, quiz, snippets } from './mock-data';
import type { CourseContent } from './api';

export function mockContent(title?: string, level = 'Beginner', durationMin = 90, runtime = 'Java 21.0.2'): CourseContent {
  return {
    live: false, runnerLang: 'java', language: 'Java', version: '21',
    slides: javaSlides.map((s, i) => (i === 0 ? { ...s, title: title ?? s.title, bullets: [`${level} · ${durationMin} minutes · ${runtime}`] } : s)),
    examples: codeExamples.map(e => ({ id: e.id, title: e.title, description: e.description, code: e.code, expected: e.output, output: e.output, ms: e.ms, status: 'passed' as const, attempts: [] })),
    exercises: exercises.map(x => ({ id: x.id, title: x.title, difficulty: x.difficulty, statement: x.statement, starter: x.starter, solution: '', naive: '', status: 'passed' as const, tests: x.tests.map(t => ({ name: t.name, pass: t.pass, error: 'error' in t ? (t as { error?: string }).error : undefined, ms: t.ms })), reference: x.reference, naiveResult: x.naive, attempts: [] })),
    quiz, cheat: cheatSheet.map(c => ({ title: c.title, items: c.items.map(i => [...i]) })),
    snippets: snippets.map(s => ({ id: s.id, name: s.name, location: s.location, kind: 'example' as const, code: s.code, expected: s.expected, actual: s.actual, status: 'passed' as const, attempts: [], ms: s.ms })),
    summary: { total: 14, verifiable: 14, passed: 14, failed: 0, autoFixed: 1, skipped: 0 },
  };
}
