"""
Run once after applying questions_schema.sql:

    uv run python seed_questions.py

Safe to re-run — it checks for existing seeded rows with the same text
before inserting, so it won't create duplicates.
"""

from app.db import supabase

SEED_QUESTIONS = [
    # DSA
    ("DSA", "Medium", "How would you design a URL shortener?"),
    ("DSA", "Easy", "Explain the difference between a stack and a queue with real-world examples."),
    ("DSA", "Medium", "Given an array of integers, find two numbers that add up to a target sum."),
    ("DSA", "Hard", "How would you find the longest substring without repeating characters?"),
    ("DSA", "Medium", "Explain how a hash map works internally and how collisions are handled."),
    ("DSA", "Hard", "How would you detect a cycle in a linked list?"),
    ("DSA", "Medium", "What's the time complexity difference between quicksort and mergesort, and when would you prefer one?"),

    # System Design
    ("System Design", "Hard", "Design a rate limiter for a public API."),
    ("System Design", "Hard", "How would you design a scalable notification system (email, SMS, push)?"),
    ("System Design", "Medium", "How would you design a URL shortener at scale (millions of requests/day)?"),
    ("System Design", "Hard", "Design the backend for a ride-sharing app's live location tracking."),
    ("System Design", "Medium", "How would you shard a database that's grown too large for one instance?"),
    ("System Design", "Hard", "Design a system to deduplicate millions of incoming events per second."),

    # Behavioral
    ("Behavioral", "Easy", "Tell me about a challenging project you worked on and what you learned."),
    ("Behavioral", "Easy", "Describe a time you disagreed with a teammate. How did you handle it?"),
    ("Behavioral", "Medium", "Tell me about a time you had to meet a tight deadline with limited resources."),
    ("Behavioral", "Easy", "What's a mistake you made at work, and what did you do about it?"),
    ("Behavioral", "Medium", "Describe a situation where you had to convince others to adopt your idea."),
    ("Behavioral", "Easy", "How do you prioritize tasks when everything feels urgent?"),

    # Coding / Problem Solving
    ("Coding", "Medium", "Write a function to check if a string is a valid palindrome, ignoring non-alphanumeric characters."),
    ("Coding", "Hard", "Implement an LRU cache with O(1) get and put operations."),
    ("Coding", "Medium", "Given a list of intervals, merge all overlapping intervals."),
    ("Coding", "Hard", "Implement a function to serialize and deserialize a binary tree."),
    ("Problem Solving", "Medium", "How would you estimate the number of piano tuners in a large city?"),
    ("Problem Solving", "Medium", "How would you test a vending machine before it ships?"),
]


def main():
    existing = {
        r["question_text"]
        for r in supabase.table("questions").select("question_text").eq("source", "seeded").execute().data
    }

    rows = [
        {
            "role": None,
            "topic": topic,
            "difficulty": difficulty,
            "type": "coding" if topic in ("DSA", "Coding") else topic.lower().replace(" ", "_"),
            "question_text": text,
            "source": "seeded",
        }
        for topic, difficulty, text in SEED_QUESTIONS
        if text not in existing
    ]

    if not rows:
        print("Nothing new to seed — all questions already exist.")
        return

    supabase.table("questions").insert(rows).execute()
    print(f"Seeded {len(rows)} questions.")


if __name__ == "__main__":
    main()