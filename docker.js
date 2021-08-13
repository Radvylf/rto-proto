(() => {
    var EventEmitter = require("events").EventEmitter;
    var Readable = require("stream").Readable;
    
    var child_process = require("child_process");
    var readline = require("readline");
    
    var log_0, log_1, log_2;
    
    var random = () => {
        var n_22 = (data, n) => (data / (22 ** n) | 0) % 22;

        var numbers = [
            "a", "b", "c", "d", "f", "g", "i", "j", "k", "n", "o",
            "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"
        ];

        return [
            ...Array(10).fill(0).map((_, i) => n_22(Date.now(), (10 - 1) - i)),
            Math.random() * 22 | 0, Math.random() * 22 | 0
        ].map(x => numbers[x]).join("");
    };
    
    class CouldNotRun extends Error {
        constructor() {
            super(...arguments);

            this.name = this.constructor.name;
        }
    }
    
    class CouldNotStop extends Error {
        constructor() {
            super(...arguments);

            this.name = this.constructor.name;
        }
    }
    
    class Container extends EventEmitter {
        constructor() {
            super();
            
            this.id = random();
            this.docker = null;
        }
        
        async run(image, input, timeout = 60, storage = {}, cpus = {}) {
            if (this.docker != null) {
                log_2("run (" + this.id + "): could not run: already running");
                
                throw new CouldNotRun("This container is currently running");
            }
            
            var args = [];

            if (storage.normal != null)
                args.push(["--memory", storage.normal]);

            if (storage.soft != null)
                args.push(["--memory-reservation", storage.soft]);

            if (storage.swap != null && storage.normal != null)
                args.push(["--memory-swap", (storage.normal + storage.swap)]);

            if (cpus.shares != null)
                args.push(["--cpu-shares", cpus.shares]);

            if (cpus.count != null)
                args.push(["--cpus", cpus.count]);
            
            var all_args = ["--foreground", "-s", "SIGKILL", timeout, "docker", "run", "--rm", "-i", "--runtime", "runsc", "--network", "none", ...args.flat(), "--name", "rto_" + this.id, image];

            log_0("run (" + this.id + "): spawn: timeout " + JSON.stringify(all_args));
            
            this.docker = child_process.spawn("timeout", all_args);
            
            this.docker.stderr.on("data", (data) => {
                log_1("run (" + this.id + "): on.back: " + JSON.stringify(data.toString()));
            });
            
            this.docker.on("error", (info) => {
                log_1("run (" + this.id + "): could not run: " + JSON.stringify(info));
                
                throw new CouldNotRun("Could not run container");

                return;
            });

            var input_stream = new Readable({
                read() {}
            });

            input_stream.push(JSON.stringify(input));
            input_stream.push(null);

            input_stream.pipe(this.docker.stdin);

            input_stream.on("end", () => this.docker.stdin.end());

            var stdout = readline.createInterface({
                input: this.docker.stdout,
                terminal: false
            });

            stdout.on("line", (data) => {
                try {
                    data = JSON.parse(data.toString());
                    
                    log_0("run (" + this.id + "): on.data: JSON: " + JSON.stringify(data));
                    
                    this.emit("data", data);
                } catch (info) {
                    log_2("run (" + this.id + "): on.data: non-JSON: " + JSON.stringify(data));
                    log_2("run (" + this.id + "): on.data: non-JSON info: " + JSON.stringify(info));
                    
                    if (this.docker != null) {
                        log_1("run (" + this.id + "): on.data: stopping");
                        
                        this.stop();
                        
                        return;
                    }
                    
                    log_1("run (" + this.id + "): on.data: not running");
                }
            });
            
            this.docker.on("close", (code) => {
                this.docker = null;
                
                log_1("run (" + this.id + "): finish: " + code);
                
                this.emit("finish", (code == 0 ? 0 : code == 124 ? -1 : 1));
            });
        }
        
        async stop() {
            if (this.docker == null) {
                log_2("stop (" + this.id + "): could not stop: not running");
                
                throw new CouldNotStop("This container is not currently running");
            }
            
            return new Promise((resolve, reject) => {
                log_1("stop (" + this.id + "): spawn");
                
                var stop = child_process.spawn("docker", ["kill", "rto_" + this.id]);
                
                stop.on("close", (code) => {
                    if (code != 0) {
                        log_2("stop (" + this.id + "): could not stop: " + code);
                        
                        reject(new CouldNotStop("Could not stop container"));
                        
                        return;
                    }
                    
                    log_1("stop (" + this.id + "): stopped");
                    
                    resolve();
                });
            });
        }
        
        get in_use() {
            return this.docker != null ? 1 : 0;
        }
    }
    
    module.exports = {
        Container: Container,
        init_log: (log_library) => {
            var init = log_library.init("docker");
            
            log_0 = init.log_0;
            log_1 = init.log_1;
            log_2 = init.log_2;
            
            log_0("confirm log_0");
            log_1("confirm log_1");
            log_2("confirm log_2");
        }
    };
})();