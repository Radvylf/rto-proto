(async () => {
    var ws = require("./ws");
    var docker = require("./docker");
    var json_parser = require("./json_parser");
    var log_library = require("./log");
    
    var {log_0, log_1, log_2} = (await log_library.start("logs")).init("main");
    
    log_0("confirm log_0");
    log_1("confirm log_1");
    log_2("confirm log_2");
    
    ws.init_log(log_library);
    docker.init_log(log_library);
    
    for (var i = 100; i <= 12800; i *= 2) {
        try {
            await ws.start(8081);
            
            break;
        } catch (info) {
            log_2("ws.start: fail: " + JSON.stringify(info));
            log_2("ws.start: waiting: " + (i / 1000).toFixed(3));
            
            await new Promise((r) => setTimeout(r, i));
            
            continue;
        }
    }
    
    if (ws.status != 1) {
        log_2("ws.start: did not start");
        
        throw new ws.StartFailure("WSInstance did not start");
    }
    
    ws.on("actor", (actor) => {
        log_1("on.actor: " + actor.id);
        
        var KB = 1000;

        var standard_storage = {
            normal: 200 * KB ** 2,
            soft: 100 * KB ** 2,
            swap: 0
        };

        var standard_cpus = {
            shares: 128,
            count: 1.0
        };
        
        var container = new docker.Container();
        
        log_1("actor (" + actor.id + "): container: init");
        
        actor.on("run", async (input, respond) => {
            log_1("actor (" + actor.id + "): run: " + JSON.stringify(input));
            
            var confirm;
            
            var language, interpreter;
            
            try {
                confirm = json_parser.confirm_input(input);
                
                language = confirm.language;
                interpreter = confirm.interpreter;
                
                log_1("actor (" + actor.id + "): run: confirmed input");
            } catch (info) {
                log_1("actor (" + actor.id + "): run: could not confirm input");
                
                actor.disconnect(info.notify);
                
                return;
            }

            if (container.in_use) {
                log_1("actor (" + actor.id + "): run: in use");
                
                respond({
                    did_run: -1
                });
                
                return;
            }

            try {
                await container.run(interpreter.image, json_parser.input_to_format(input, interpreter.format), 40, standard_storage, standard_cpus);
                
                log_1("actor (" + actor.id + "): run: running");
                
                respond({
                    did_run: 1
                });
            } catch (info) {
                log_1("actor (" + actor.id + "): run: could not run: " + JSON.stringify(info));
                
                respond({
                    did_run: 0
                });
                
                return;
            }
            
            container.on("data", (output) => {
                log_1("actor (" + actor.id + "): run: on.data: " + JSON.stringify(output));
                
                if (!json_parser.confirm_output(output, language, interpreter.format)) {
                    log_2("actor (" + actor.id + "): run: on.data: could not confirm output: (output: " + JSON.stringify(output) + ", interpreter: " + JSON.stringify(language) + ", format: " + interpreter.format + ")");
                    
                    return;
                }
                
                log_1("actor (" + actor.id + "): run: on.data: confirmed output");
                
                actor.notify({
                    action: "output",
                    data: json_parser.output_from_format(output, interpreter.format)
                });
            });
            
            container.on("finish", (status) => {
                log_1("actor (" + actor.id + "): run: on.finish: " + status);
                
                container.removeAllListeners("data");
                container.removeAllListeners("finish");
                
                actor.notify({
                    action: "finish",
                    data: {
                        status: status
                    }
                });
            });
        });
        
        actor.on("stop", async (respond) => {
            log_1("actor (" + actor.id + "): stop");
            
            if (!container.in_use) {
                log_1("actor (" + actor.id + "): stop: not running");
                
                respond({
                    did_stop: -1
                });
                
                return;
            }
            
            try {
                await container.stop();
                
                log_1("actor (" + actor.id + "): stop: stopped");
                
                respond({
                    did_stop: 1
                });
            } catch (info) {
                log_1("actor (" + actor.id + "): stop: could not stop: " + JSON.stringify(info));
                
                respond({
                    did_stop: 0
                });
            }
        });
    });
})();