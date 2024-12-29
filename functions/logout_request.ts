export const onRequest = async () => {
  return new Response(
    '<!DOCTYPE html>\n' +
    '<html lang="en">\n' +
    '<head>\n' +
    '    <meta charset="UTF-8">\n' +
    '    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '    <title>Logout</title>\n' +
    '</head>\n' +
    '<body>\n' +
    '    <h1>页面即将跳转</h1>\n' +
    '    <p>您将在 <span id="countdown">3.000</span> 秒后跳转到首页</p>\n' +
    '\n' +
    '    <script>\n' +
    '        let milliseconds = 3000;\n' +
    '        const countdownElement = document.getElementById(\'countdown\');\n' +
    '\n' +
    '        const intervalId = setInterval(() => {\n' +
    '            milliseconds -= 100;\n' +
    '            countdownElement.textContent = (milliseconds / 1000).toFixed(1);\n' +
    '\n' +
    '            if (milliseconds <= 0) {\n' +
    '                clearInterval(intervalId);\n' +
    '                window.location.href = \'/\';\n' +
    '            }\n' +
    '        }, 100);\n' +
    '    </script>\n' +
    '</body>\n' +
    '</html>\n',
    {headers: {'content-type': 'text/html; charset=utf-8'}, status: 401});
};
