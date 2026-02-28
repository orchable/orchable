// 🔨 Task [2.2] - Create unified Document Parsing utility
// Implements: openspec/changes/add-stage-io-features/specs/assets/spec.md
// Requirement: Auxiliary Text Document Library Management

export interface ParsedDocument {
	content: string;
	lineCount: number;
	wordCount: number;
	tokenCountEst: number;
	fileType: "txt" | "md" | "csv" | "tsv";
}

/**
 * Parses raw text content based on file type and returns metadata.
 * Token estimation is a rough heuristic (1 token ~= 4 characters).
 */
export const parseDocumentContent = (
	rawText: string,
	fileName: string,
): ParsedDocument => {
	const fileType = getFileType(fileName);
	const content = rawText.trim();

	const lines = content.split(/\r?\n/);
	const words = content.split(/\s+/).filter((w) => w.length > 0);

	// Implements: Scenario "User uploads a reference document... system parses... token estimations"
	const tokenCountEst = Math.ceil(content.length / 4);

	return {
		content,
		lineCount: lines.length,
		wordCount: words.length,
		tokenCountEst,
		fileType,
	};
};

const getFileType = (fileName: string): "txt" | "md" | "csv" | "tsv" => {
	const ext = fileName.split(".").pop()?.toLowerCase();
	switch (ext) {
		case "md":
			return "md";
		case "csv":
			return "csv";
		case "tsv":
			return "tsv";
		default:
			return "txt";
	}
};
