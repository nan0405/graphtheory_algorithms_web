class QueryEngine:

    def __init__(self, kb):
        self.kb = kb

    def execute(self, parsed_query):
        Ks = parsed_query["Ks"]
        Es = parsed_query["Es"]

        results = {
            "ConceptResults": [],
            "ParResults": [],
            "RelatedResults": []
        }

        for entity in Es:
            if entity in self.kb["Methods"]:
                obj = self.kb["Methods"][entity]

                for k in Ks:
                    if k in obj["Def"]:
                        results["ParResults"].append({
                            "entity": entity,
                            "section": k,
                            "content": obj["Def"][k]
                        })

                # Related
                for rel in obj.get("related", []):
                    results["RelatedResults"].append(rel)

        return results