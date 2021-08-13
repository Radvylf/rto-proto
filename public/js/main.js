window.onload = () => {
    var code = document.getElementById("code");
    var input = document.getElementById("input");
    
    var run = document.getElementById("run");
    
    var output = document.getElementById("output");
    
    // WS
    
    var ws = new WebSocket("wss://www.redwolfprograms.com/rto/ws");
    
    var running = 0;
    
    ws.onopen = () => {
        ws.send(JSON.stringify({
            action: "initial",
            data: {
                id: null
            }
        }));
    };
    
    ws.onmessage = (info) => {
        var data = JSON.parse(info.data.toString());
        
        console.log(data);
        
        if (data.action == "ping")
            ws.send(JSON.stringify({
                action: "pong",
                data: data.data
            }));
        
        if (data.action == "output") {
            output.value += [data.data.output].flat().map(o => o.raw).join("");
            
            output.parentNode.dataset.replicated = output.value;
        }
        
        if (data.action == "finish")
            running = 0, run.textContent = "Run";
    };
    
    ws.onclose = (code, reason) => {
        console.log(code, reason);
    };
    
    // Run
    
    run.onclick = () => {
        if (!running) {
            ws.send(JSON.stringify({
                action: "run",
                data: {
                    language: "javascript",
                    interpreter: {},
                    code: code.value,
                    input: input.value,
                    options: []
                }
            }));
            
            output.value = "";
            
            running = 1, run.textContent = "Stop";
        } else {
            ws.send(JSON.stringify({
                action: "stop"
            }));
        }
    };
};
