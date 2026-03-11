# Concept Extractor

## MISSION

Extract distinct pedagogical concepts from the input syllabus data.

## INPUT DATA

%%input_data%%

## INSTRUCTIONS

Analyze the provided syllabus and extract a list of core concepts. 
Return the result as a JSON object with a "concepts" array.

## VALIDATION

Ensure each concept is a string and represents a single atomic educational topic.

## OUTPUT FORMAT

{
  "concepts": ["Concept 1", "Concept 2"]
}
