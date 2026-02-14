import { describe, test, expect, spyOn } from "bun:test";

import { fisherYatesShuffle } from "./shuffle";

describe("fisherYatesShuffle", () => {
  test("returns array with same length", () => {
    const input = [1, 2, 3, 4, 5];
    const result = fisherYatesShuffle(input);
    expect(result).toHaveLength(input.length);
  });

  test("returns array with same elements", () => {
    const input = [1, 2, 3, 4, 5];
    const result = fisherYatesShuffle(input);
    expect(result.sort((a, b) => a - b)).toEqual(input.sort((a, b) => a - b));
  });

  test("does not mutate original array", () => {
    const input = [1, 2, 3, 4, 5];
    const original = [...input];
    fisherYatesShuffle(input);
    expect(input).toEqual(original);
  });

  test("handles empty array", () => {
    const result = fisherYatesShuffle([]);
    expect(result).toEqual([]);
  });

  test("handles single element array", () => {
    const result = fisherYatesShuffle([42]);
    expect(result).toEqual([42]);
  });

  test("handles two element array", () => {
    const input = [1, 2];
    const result = fisherYatesShuffle(input);
    expect(result).toHaveLength(2);
    expect(result).toContain(1);
    expect(result).toContain(2);
  });

  test("produces different results with different random values", () => {
    const input = [1, 2, 3, 4, 5];

    const randomSpy = spyOn(Math, "random");
    randomSpy.mockReturnValue(0.1);
    const result1 = fisherYatesShuffle(input);

    randomSpy.mockReturnValue(0.9);
    const result2 = fisherYatesShuffle(input);

    randomSpy.mockRestore();

    expect(result1).not.toEqual(result2);
  });

  test("deterministic with mocked random", () => {
    const input = [1, 2, 3, 4];
    const randomSpy = spyOn(Math, "random");

    randomSpy.mockReturnValueOnce(0.5);
    randomSpy.mockReturnValueOnce(0.5);
    randomSpy.mockReturnValueOnce(0.5);

    const result = fisherYatesShuffle(input);

    randomSpy.mockRestore();

    expect(result).toHaveLength(4);
    expect(result).toContain(1);
    expect(result).toContain(2);
    expect(result).toContain(3);
    expect(result).toContain(4);
  });
});
