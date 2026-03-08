/**
 * Utility for exporting an array of JSON objects to a CSV file.
 * Handles nested objects by stringifying them and adds BOM for Excel UTF-8 compatibility.
 */
export function exportToCsv(data: Record<string, unknown>[], filename: string) {
	if (!data || !data.length) {
		console.warn("No data available to export");
		return;
	}

	// Collect all unique keys from all objects to form headers
	const allKeys = new Set<string>();
	data.forEach((item) => {
		if (typeof item === "object" && item !== null) {
			Object.keys(item).forEach((key) => allKeys.add(key));
		}
	});

	const headers = Array.from(allKeys);

	// Create CSV content
	const csvRows = [];

	// 1. Add header row
	csvRows.push(
		headers.map((header) => `"${header.replace(/"/g, '""')}"`).join(","),
	);

	// 2. Add data rows
	for (const row of data) {
		const values = headers.map((header) => {
			const val = row[header];
			let stringVal = "";

			if (val === null || val === undefined) {
				stringVal = "";
			} else if (typeof val === "object") {
				stringVal = JSON.stringify(val);
			} else {
				stringVal = String(val);
			}

			// Escape quotes by doubling them
			const escaped = stringVal.replace(/"/g, '""');
			return `"${escaped}"`;
		});
		csvRows.push(values.join(","));
	}

	// Add BOM for Excel UTF-8 compatibility
	const csvString = "\uFEFF" + csvRows.join("\n");
	const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });

	// Create download link
	const link = document.createElement("a");
	if (link.download !== undefined) {
		const url = URL.createObjectURL(blob);
		link.setAttribute("href", url);
		link.setAttribute(
			"download",
			filename.endsWith(".csv") ? filename : `${filename}.csv`,
		);
		link.style.visibility = "hidden";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}
}

/**
 * Utility for creating a TSV string (Tab-Separated Values) suitable for pasting into Google Sheets
 */
function createTsvString(data: Record<string, unknown>[]): string {
	if (!data || !data.length) return "";

	const allKeys = new Set<string>();
	data.forEach((item) => {
		if (typeof item === "object" && item !== null) {
			Object.keys(item).forEach((key) => allKeys.add(key));
		}
	});

	const headers = Array.from(allKeys);
	const tsvRows = [];

	// Header row
	tsvRows.push(headers.join("\t"));

	// Data rows
	for (const row of data) {
		const values = headers.map((header) => {
			const val = row[header];
			let stringVal = "";

			if (val === null || val === undefined) {
				stringVal = "";
			} else if (typeof val === "object") {
				stringVal = JSON.stringify(val);
			} else {
				stringVal = String(val);
			}

			// Remove tabs and newlines from values so it doesn't break TSV format
			const cleanString = stringVal
				.replace(/\t/g, " ")
				.replace(/\n/g, " ");
			return cleanString;
		});
		tsvRows.push(values.join("\t"));
	}

	return tsvRows.join("\n");
}

/**
 * Utility for exporting data to a .tsv file
 */
export function exportToTsv(data: Record<string, unknown>[], filename: string) {
	const tsvString = createTsvString(data);
	if (!tsvString) return;

	const blob = new Blob([tsvString], {
		type: "text/tab-separated-values;charset=utf-8;",
	});
	const link = document.createElement("a");
	if (link.download !== undefined) {
		const url = URL.createObjectURL(blob);
		link.setAttribute("href", url);
		link.setAttribute(
			"download",
			filename.endsWith(".tsv") ? filename : `${filename}.tsv`,
		);
		link.style.visibility = "hidden";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}
}

/**
 * Utility for copying TSV data directly to clipboard (best for Google Sheets)
 */
export async function copyToTsvClipboard(
	data: Record<string, unknown>[],
): Promise<boolean> {
	const tsvString = createTsvString(data);
	if (!tsvString) return false;

	try {
		await navigator.clipboard.writeText(tsvString);
		return true;
	} catch (err) {
		console.error("Failed to copy TSV to clipboard:", err);
		return false;
	}
}
