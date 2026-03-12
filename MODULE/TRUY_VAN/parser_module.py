import re

class QueryParser:

    def __init__(self, kb):
        self.kb = kb

    def parse(self, query: str):
        query = query.lower()

        Ks = []
        Es = []
        Conditions = []

        # Detect entity
        for key, value in self.kb["Entities"].items():
            if key in query:
                Es.append(value)

        # Detect section
        for section, keywords in self.kb["KWs"].items():
            for kw in keywords:
                if kw in query:
                    Ks.append(section)

        # Fallback logic
        if not Ks:
            Ks.append("definition")

        return {
            "Ks": list(set(Ks)),
            "Es": list(set(Es)),
            "Conditions": Conditions
        }