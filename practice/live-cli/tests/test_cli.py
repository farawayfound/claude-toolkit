import io
import json
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path

from deals.cli import main
from deals.store import DealStore

FIXTURE = [
    {"id": "d-1", "name": "Alpha", "owner_id": "u-ana", "stage": "proposal", "amount": 100},
    {"id": "d-2", "name": "Beta", "owner_id": "u-ben", "stage": "qualified", "amount": 200},
    {"id": "d-3", "name": "Gamma", "owner_id": "u-cy", "stage": "prospect", "amount": 300},
]


class CliTest(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        path = Path(tmp.name) / "deals.json"
        path.write_text(json.dumps(FIXTURE), encoding="utf-8")
        self.store = DealStore(path)

    def run_cli(self, *argv):
        out = io.StringIO()
        with redirect_stdout(out):
            code = main(list(argv), store=self.store)
        return code, out.getvalue()

    def test_list_returns_deals(self):
        code, out = self.run_cli("list")
        self.assertEqual(code, 0)
        self.assertEqual([d["id"] for d in json.loads(out)], ["d-1", "d-2", "d-3"])

    def test_update_sets_stage(self):
        code, _ = self.run_cli("update", "d-1", "--set", "stage=won", "--as", "u-ana")
        self.assertEqual(code, 0)
        self.assertEqual(self.store.get("d-1")["stage"], "won")

    def test_close_marks_lost(self):
        code, _ = self.run_cli("close", "d-2", "--lost")
        self.assertEqual(code, 0)
        self.assertEqual(self.store.get("d-2")["stage"], "lost")


if __name__ == "__main__":
    unittest.main()
