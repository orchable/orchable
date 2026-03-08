async function test() {
	const webhookUrl =
		"https://script.google.com/macros/s/AKfycby8LEmi0Ky1mcbLnOyJIqgUI4jByPLPIX8a48yFsFRjptaoyMPK8XyCXz9lRzA86r1tRw/exec";
	const sheetUrl =
		"https://docs.google.com/spreadsheets/d/1TmdG3Yst9XgVlppYlg2PGHLaLVLzdtqnyVlLp5P2ZuA/edit";
	const sheetName = "Data";

	const targetUrl = `${webhookUrl}?sheetUrl=${encodeURIComponent(sheetUrl)}&sheetName=${encodeURIComponent(sheetName)}`;

	console.log("Testing URL:", targetUrl);

	const payload =
		"id\ttest\tcomment\n1\tTest Row 1\tSent via script\n2\tTest Row 2\tTime: " +
		new Date().toISOString();

	try {
		const response = await fetch(targetUrl, {
			method: "POST",
			headers: {
				"Content-Type": "text/plain",
			},
			body: payload,
		});

		console.log("Status:", response.status);
		console.log("Status Text:", response.statusText);

		const text = await response.text();
		console.log("Response Body snippet:", text.substring(0, 500));

		if (text.includes('success":true')) {
			console.log("✅ Webhook success!");
		} else {
			console.log("❌ Webhook failed or returned unexpected content.");
		}
	} catch (error) {
		console.error("Error during fetch:", error);
	}
}

test();
