// Kart ve manifest aynı tanımdan üretilir; skill ve çalışma modu ayrışmaz.
export const agent = { name: "Text length agent", version: "0.1.0" };
export const capability = {
  "id": "team-example/text-length",
  "version": "1.0.0",
  "skillId": "text-length",
  "title": "Metin uzunluğu",
  "description": "Unicode kod noktalarının sayısını döndürür; byte sayısı değildir.",
  "executionMode": "deterministic",
  "sideEffects": "none",
  "inputSchema": {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "additionalProperties": false,
    "required": [
      "text"
    ],
    "properties": {
      "text": {
        "type": "string",
        "maxLength": 8000
      }
    }
  },
  "outputSchema": {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "additionalProperties": false,
    "required": [
      "length"
    ],
    "properties": {
      "length": {
        "type": "integer",
        "minimum": 0,
        "maximum": 8000
      }
    }
  },
  "examples": [
    {
      "input": {
        "text": "abc"
      },
      "output": {
        "length": 3
      }
    }
  ]
} as const;
