import json
import logging
logger = logging.getLogger(__name__)

class DataBase:
    def __init__(self, file_name: str):
        self._filename = file_name

    def read(self) -> dict:
        try:
            with open(self._filename, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if not content:
                    return {}
                return json.loads(content)
        except FileNotFoundError:
            return {}
            logging.error(f"File {self._filename} not found")
        except json.JSONDecodeError:
            return {}

    def write(self, data: dict):
        with open(self._filename, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
