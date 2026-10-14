"""File-backed deal store standing in for the CRM API."""
import json
from pathlib import Path

DEFAULT_PATH = Path(__file__).resolve().parent.parent / "data" / "deals.json"


class DealStore:
    def __init__(self, path=DEFAULT_PATH):
        self.path = Path(path)
        self.deals = {d["id"]: d for d in json.loads(self.path.read_text(encoding="utf-8"))}

    def get(self, deal_id):
        return self.deals[deal_id]

    def page(self, cursor=None, limit=5):
        """Return (deals, next_cursor); next_cursor is None on the last page."""
        ids = sorted(self.deals)
        start = int(cursor or 0)
        end = start + limit
        return [self.deals[i] for i in ids[start:end]], (str(end) if end < len(ids) else None)

    def update(self, deal_id, fields):
        self.deals[deal_id].update(fields)
        self.path.write_text(json.dumps(list(self.deals.values()), indent=2) + "\n", encoding="utf-8")
        return self.deals[deal_id]
