"""
Run once after applying coding_problems_schema.sql:

    uv run python seed_coding_problems.py

Every test case below was manually traced against the standard textbook
solution before being added — deterministic single-answer problems only,
to avoid the "multiple valid outputs" ambiguity that breaks deep-equal
grading (e.g. Group Anagrams / multi-solution Two Sum variants are
deliberately excluded for this reason).

NOTE: JS starter code intentionally uses snake_case function names (e.g.
`two_sum`, not `twoSum`) so the same `function_name` value works to look
up the function in both the Python and JS runner harnesses without
needing a separate field per language.
"""

from app.db import supabase

PROBLEMS = [
    dict(
        slug="two-sum",
        title="Two Sum",
        difficulty="Easy",
        topic="Arrays",
        description=(
            "Given an array of integers `nums` and an integer `target`, return the indices "
            "of the two numbers that add up to `target`. Assume exactly one valid pair exists, "
            "and you may not use the same element twice."
        ),
        examples=[
            {"input": "nums = [2,7,11,15], target = 9", "output": "[0,1]", "explanation": "nums[0] + nums[1] == 9"},
            {"input": "nums = [3,2,4], target = 6", "output": "[1,2]"},
        ],
        constraints=["2 <= nums.length <= 10^4", "Only one valid answer exists."],
        function_name="two_sum",
        starter_code={
            "python": "def two_sum(nums, target):\n    # write your solution here\n    pass\n",
            "javascript": "function two_sum(nums, target) {\n  // write your solution here\n}\n",
        },
        tests=[
            {"args": [[2, 7, 11, 15], 9], "expected": [0, 1]},
            {"args": [[3, 2, 4], 6], "expected": [1, 2]},
            {"args": [[3, 3], 6], "expected": [0, 1]},
        ],
    ),
    dict(
        slug="valid-palindrome",
        title="Valid Palindrome",
        difficulty="Easy",
        topic="Strings",
        description=(
            "Given a string `s`, return true if it is a palindrome after converting all "
            "uppercase letters to lowercase and removing all non-alphanumeric characters."
        ),
        examples=[
            {"input": '"A man, a plan, a canal: Panama"', "output": "true"},
            {"input": '"race a car"', "output": "false"},
        ],
        constraints=["1 <= s.length <= 2 * 10^5"],
        function_name="is_palindrome",
        starter_code={
            "python": "def is_palindrome(s):\n    # write your solution here\n    pass\n",
            "javascript": "function is_palindrome(s) {\n  // write your solution here\n}\n",
        },
        tests=[
            {"args": ["A man, a plan, a canal: Panama"], "expected": True},
            {"args": ["race a car"], "expected": False},
            {"args": [" "], "expected": True},
        ],
    ),
    dict(
        slug="best-time-to-buy-sell-stock",
        title="Best Time to Buy and Sell Stock",
        difficulty="Easy",
        topic="Arrays",
        description=(
            "Given an array `prices` where prices[i] is the stock price on day i, return the "
            "maximum profit from buying on one day and selling on a later day. Return 0 if no "
            "profit is possible."
        ),
        examples=[
            {"input": "prices = [7,1,5,3,6,4]", "output": "5", "explanation": "Buy at 1, sell at 6"},
            {"input": "prices = [7,6,4,3,1]", "output": "0"},
        ],
        constraints=["1 <= prices.length <= 10^5"],
        function_name="max_profit",
        starter_code={
            "python": "def max_profit(prices):\n    # write your solution here\n    pass\n",
            "javascript": "function max_profit(prices) {\n  // write your solution here\n}\n",
        },
        tests=[
            {"args": [[7, 1, 5, 3, 6, 4]], "expected": 5},
            {"args": [[7, 6, 4, 3, 1]], "expected": 0},
            {"args": [[1, 2]], "expected": 1},
        ],
    ),
    dict(
        slug="longest-substring-without-repeating-characters",
        title="Longest Substring Without Repeating Characters",
        difficulty="Medium",
        topic="Strings",
        description="Given a string `s`, return the length of the longest substring without repeating characters.",
        examples=[
            {"input": '"abcabcbb"', "output": "3", "explanation": '"abc" has length 3'},
            {"input": '"bbbbb"', "output": "1"},
        ],
        constraints=["0 <= s.length <= 5 * 10^4"],
        function_name="length_of_longest_substring",
        starter_code={
            "python": "def length_of_longest_substring(s):\n    # write your solution here\n    pass\n",
            "javascript": "function length_of_longest_substring(s) {\n  // write your solution here\n}\n",
        },
        tests=[
            {"args": ["abcabcbb"], "expected": 3},
            {"args": ["bbbbb"], "expected": 1},
            {"args": ["pwwkew"], "expected": 3},
            {"args": [""], "expected": 0},
        ],
    ),
    dict(
        slug="maximum-subarray",
        title="Maximum Subarray",
        difficulty="Medium",
        topic="Dynamic Programming",
        description=(
            "Given an integer array `nums`, find the contiguous subarray with the largest sum "
            "and return that sum."
        ),
        examples=[
            {"input": "nums = [-2,1,-3,4,-1,2,1,-5,4]", "output": "6", "explanation": "[4,-1,2,1] has the largest sum"},
        ],
        constraints=["1 <= nums.length <= 10^5"],
        function_name="max_subarray",
        starter_code={
            "python": "def max_subarray(nums):\n    # write your solution here\n    pass\n",
            "javascript": "function max_subarray(nums) {\n  // write your solution here\n}\n",
        },
        tests=[
            {"args": [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], "expected": 6},
            {"args": [[1]], "expected": 1},
            {"args": [[5, 4, -1, 7, 8]], "expected": 23},
        ],
    ),
    dict(
        slug="valid-anagram",
        title="Valid Anagram",
        difficulty="Easy",
        topic="Strings",
        description="Given two strings `s` and `t`, return true if `t` is an anagram of `s`.",
        examples=[
            {"input": 's = "anagram", t = "nagaram"', "output": "true"},
            {"input": 's = "rat", t = "car"', "output": "false"},
        ],
        constraints=["1 <= s.length, t.length <= 5 * 10^4"],
        function_name="is_anagram",
        starter_code={
            "python": "def is_anagram(s, t):\n    # write your solution here\n    pass\n",
            "javascript": "function is_anagram(s, t) {\n  // write your solution here\n}\n",
        },
        tests=[
            {"args": ["anagram", "nagaram"], "expected": True},
            {"args": ["rat", "car"], "expected": False},
        ],
    ),
    dict(
        slug="merge-intervals",
        title="Merge Intervals",
        difficulty="Medium",
        topic="Arrays",
        description=(
            "Given an array of intervals where intervals[i] = [start, end], merge all "
            "overlapping intervals and return the result sorted by start time."
        ),
        examples=[
            {"input": "intervals = [[1,3],[2,6],[8,10],[15,18]]", "output": "[[1,6],[8,10],[15,18]]"},
        ],
        constraints=["1 <= intervals.length <= 10^4"],
        function_name="merge_intervals",
        starter_code={
            "python": "def merge_intervals(intervals):\n    # write your solution here\n    pass\n",
            "javascript": "function merge_intervals(intervals) {\n  // write your solution here\n}\n",
        },
        tests=[
            {"args": [[[1, 3], [2, 6], [8, 10], [15, 18]]], "expected": [[1, 6], [8, 10], [15, 18]]},
            {"args": [[[1, 4], [4, 5]]], "expected": [[1, 5]]},
        ],
    ),
    dict(
        slug="valid-parentheses",
        title="Valid Parentheses",
        difficulty="Easy",
        topic="Stacks",
        description=(
            "Given a string `s` containing just the characters '(', ')', '{', '}', '[' and ']', "
            "determine if the input string is valid (every bracket is closed in the correct order)."
        ),
        examples=[
            {"input": '"()[]{}"', "output": "true"},
            {"input": '"(]"', "output": "false"},
        ],
        constraints=["1 <= s.length <= 10^4"],
        function_name="is_valid_parentheses",
        starter_code={
            "python": "def is_valid_parentheses(s):\n    # write your solution here\n    pass\n",
            "javascript": "function is_valid_parentheses(s) {\n  // write your solution here\n}\n",
        },
        tests=[
            {"args": ["()"], "expected": True},
            {"args": ["()[]{}"], "expected": True},
            {"args": ["(]"], "expected": False},
            {"args": ["([)]"], "expected": False},
            {"args": ["{[]}"], "expected": True},
        ],
    ),
]


def main():
    existing = {r["slug"] for r in supabase.table("coding_problems").select("slug").execute().data}
    rows = [p for p in PROBLEMS if p["slug"] not in existing]
    if not rows:
        print("Nothing new to seed — all problems already exist.")
        return
    supabase.table("coding_problems").insert(rows).execute()
    print(f"Seeded {len(rows)} coding problems.")


if __name__ == "__main__":
    main()