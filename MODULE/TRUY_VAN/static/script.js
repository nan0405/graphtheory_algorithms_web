async function ask() {
    const question = document.getElementById("question").value;

    const response = await fetch("/query", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ question })
    });

    const data = await response.json();

    let html = "<h2>Kết quả</h2>";

    data.results.ParResults.forEach(item => {
        html += `<h3>${item.section}</h3>`;
        html += `<p>${item.content}</p>`;
    });

    document.getElementById("result").innerHTML = html;
}