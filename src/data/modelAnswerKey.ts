export interface ModelAnswerKeyData {
  title: string;
  topic: string;
  totalMarks: number;
  text: string;
  isCustom: boolean;
  updatedAt?: string;
}

export const DEFAULT_CAMBRIDGE_BIDMAS_KEY: ModelAnswerKeyData = {
  title: 'Chapter 1: Numbers — Lesson 1: Order of Operations (BIDMAS)',
  topic: 'Order of Operations (BIDMAS)',
  totalMarks: 10,
  isCustom: false,
  text: `CHAPTER 1: NUMBERS — LESSON 1: ORDER OF OPERATIONS (BIDMAS)
Teacher Resource: Mr. Haitham Hussien — Subject: IGCSE / Lower Secondary Mathematics

Fundamental Rule: BIDMAS / BODMAS Priority Order:
1. Brackets / Parentheses ( )
2. Indices / Powers / Roots (x^2, sqrt(x))
3. Division & Multiplication (Left to right)
4. Addition & Subtraction (Left to right)

Questions & Official Mark Schemes:
QUESTION 1 (April/2018/Paper 1/ Q.4) [1 Mark]
A teacher asks her class to work out the answer to: 8 + 12 / 4
Mike says that the answer is 5. He is wrong. Explain why Mike is wrong.
Model Solution: Mike calculated from left to right: (8 + 12) / 4 = 20 / 4 = 5.
According to BIDMAS, division takes priority over addition: 12 / 4 = 3, then 8 + 3 = 11.
Mark Scheme [1 Mark]: Correct explanation explicitly stating that division takes priority over addition (or showing 11 with 12 / 4 = 3 first).

QUESTION 2 (Oct./2019/Paper 1/ Q.3) [1 Mark]
Work out: 5 * (4^2 + 2 - 12)
Model Solution:
Inside brackets: 4^2 = 16. Then 16 + 2 - 12 = 18 - 12 = 6.
Outside brackets: 5 * 6 = 30.
Mark Scheme [1 Mark]: Final correct value of 30 (with working shown).

QUESTION 3 (April/2020/Paper 1/ Q.1) [1 Mark]
Work out the value of: 5^2 + sqrt(121)
Model Solution:
5^2 = 25. sqrt(121) = 11.
25 + 11 = 36.
Mark Scheme [1 Mark]: Final correct answer 36.

QUESTION 4 (Oct./2022/Paper 1/ Q.26) [2 Marks]
Work out: (23 - 3 * 3)^2
Model Solution:
Multiplication inside bracket first: 3 * 3 = 9.
Bracket simplifies to: 23 - 9 = 14.
Square the result: 14^2 = 196.
Mark Scheme:
[M1] Method mark for correctly evaluating inside the bracket to get 14 (e.g. showing 23 - 9 = 14 or 14^2).
[A1] Accuracy mark for final correct value of 196.

QUESTION 5 (April/2019/Paper 1/ Q.20 Core) [1 Mark]
Calculate the value of: 2 + 8(40 - 5)
Model Solution:
Inside bracket: 40 - 5 = 35.
Multiplication: 8 * 35 = 280.
Addition: 2 + 280 = 282.
Mark Scheme [1 Mark]: Final correct answer 282.

QUESTION 6 (April/2016/Paper 1/ Q.19) [2 Marks]
Put one set of brackets in each calculation to make the answer correct.
(a) 4 + 9 * 6 - 4 = 22 -> Answer: 4 + 9 * (6 - 4) = 22 [1 Mark]
(b) 24 / 12 - 8 + 2 = 4 -> Answer: 24 / (12 - 8 + 2) = 4 [1 Mark]

QUESTION 7 (Core) [2 Marks]
Put one pair of brackets in each statement to make it correct.
(a) 10 - 4 / 2 + 18 = 21 -> Answer: (10 - 4) / 2 + 18 = 21 [1 Mark]
(b) 7 * 3 + 1 + 2 = 30 -> Answer: 7 * (3 + 1) + 2 = 30 [1 Mark]

Total Marks: 10 Marks`,
};

export const MODEL_KEY_TEMPLATES: Record<string, ModelAnswerKeyData> = {
  bidmas: DEFAULT_CAMBRIDGE_BIDMAS_KEY,
  algebra: {
    title: 'Chapter 2: Algebra — Linear Equations & Expansion',
    topic: 'Linear Equations & Expansion',
    totalMarks: 10,
    isCustom: true,
    text: `CHAPTER 2: ALGEBRA — LESSON 1: LINEAR EQUATIONS & EXPANSION
Teacher Resource: Cambridge IGCSE Mathematics Marking Rubric

QUESTION 1 [2 Marks]
Solve the equation: 3(2x - 4) = 18
Model Solution:
Expand brackets: 6x - 12 = 18 [M1].
Add 12 to both sides: 6x = 30.
Divide by 6: x = 5 [A1].
Mark Scheme: [M1] Correct expansion or division by 3. [A1] Final answer x = 5.

QUESTION 2 [2 Marks]
Solve: 5x + 7 = 2x + 19
Model Solution:
Subtract 2x: 3x + 7 = 19.
Subtract 7: 3x = 12 [M1].
Divide by 3: x = 4 [A1].
Mark Scheme: [M1] Rearranging terms with variable on one side. [A1] Final answer x = 4.

QUESTION 3 [2 Marks]
Expand and simplify: (x + 3)(x - 5)
Model Solution:
FOIL: x^2 - 5x + 3x - 15 [M1].
Combine like terms: x^2 - 2x - 15 [A1].
Mark Scheme: [M1] At least 3 terms correct. [A1] Fully simplified x^2 - 2x - 15.

QUESTION 4 [2 Marks]
Factorise completely: 6x^2 + 9x
Model Solution:
Find HCF: 3x.
Factor out: 3x(2x + 3) [2 Marks].
Mark Scheme: [M1] Partial factorisation such as x(6x + 9) or 3(2x^2 + 3x). [A1] Complete 3x(2x + 3).

QUESTION 5 [2 Marks]
Given 2(y - 3) = 14, find the value of y.
Model Solution:
y - 3 = 7 -> y = 10 (or 2y - 6 = 14 -> 2y = 20 -> y = 10).
Mark Scheme: [M1] Correct first step. [A1] y = 10.

Total Marks: 10 Marks`,
  },
  blank: {
    title: 'Custom Assignment / Exam Solution Key',
    topic: 'Custom Assessment',
    totalMarks: 10,
    isCustom: true,
    text: `ASSIGNMENT TITLE: [Enter Assignment / Chapter Title Here]
Teacher / Examiner: [Enter Name]

QUESTION 1 [Marks: 1]
Question: [Enter Question 1 text or formula]
Model Solution: [Enter the correct step-by-step working and final answer]
Mark Scheme: [Specify [M1] method marks, [A1] accuracy marks, or criteria]

QUESTION 2 [Marks: 2]
Question: [Enter Question 2 text or formula]
Model Solution: [Enter correct solution]
Mark Scheme: [M1] for step 1, [A1] for final value

QUESTION 3 [Marks: 2]
Question: [Enter Question 3 text or formula]
Model Solution: [Enter correct solution]
Mark Scheme: [Specify marks]

Total Marks: 5 Marks`,
  },
};
