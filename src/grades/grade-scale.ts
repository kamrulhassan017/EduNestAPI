export interface LetterGrade {
  letter: string;
  point: number;
}

// UGC grading scale, highest first
const SCALE: ReadonlyArray<{ min: number } & LetterGrade> = [
  { min: 80, letter: 'A+', point: 4 },
  { min: 75, letter: 'A', point: 3.75 },
  { min: 70, letter: 'A-', point: 3.5 },
  { min: 65, letter: 'B+', point: 3.25 },
  { min: 60, letter: 'B', point: 3 },
  { min: 55, letter: 'B-', point: 2.75 },
  { min: 50, letter: 'C+', point: 2.5 },
  { min: 45, letter: 'C', point: 2.25 },
  { min: 40, letter: 'D', point: 2 },
  { min: 0, letter: 'F', point: 0 },
];

export function toLetterGrade(marks: number): LetterGrade {
  const row = SCALE.find((s) => marks >= s.min) ?? SCALE[SCALE.length - 1];
  return { letter: row.letter, point: row.point };
}
