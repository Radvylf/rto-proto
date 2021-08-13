(() => {
    var Console = require("console").Console;
    
    var fs = require("fs");
    var fs_promises = require("fs/promises");
    
    class LogInstance {
        constructor(console, from) {
            this.console = console;
            this.from = from;
        }
        
        log(n, ...data) {
            try {
                this.console.log("[" + this.stamp + "]", this.from + " " + n + ":", ...data);

                console.log("[" + this.stamp + "]", this.from + " " + n + ":", ...data);
            } catch (info) {
                try {
                    this.console.log("[" + this.stamp + "]", "log 2:", "COULD NOT LOG: " + JSON.stringify(info));
                } catch (info_2) {
                    try {
                        this.console.log("[] log 2: COULD NOT LOG: " + JSON.stringify(info) + ", " + JSON.stringify(info_2));
                    } catch (info_x) {
                        // Ignore
                    }
                }
                
                try {
                    console.log("[" + this.stamp + "]", "log 2:", "COULD NOT LOG");
                } catch (info_2) {
                    try {
                        console.log("[] log 2: COULD NOT LOG: " + JSON.stringify(info) + ", " + JSON.stringify(info_2));
                    } catch (info_x) {
                        // Ignore
                    }
                }
                
                process.exit(1);
            }
        }
        
        log_0(...data) {
            this.log(0, ...data);
        }
        
        log_1(...data) {
            this.log(1, ...data);
        }
        
        log_2(...data) {
            this.log(2, ...data);
        }
        
        get stamp() {
            var format = (number, count = 2) => number.toString().padStart(count, 0);

            var now = new Date();

            return (
                now.getFullYear() + "-" + format(now.getMonth() + 1) + "-" + format(now.getDate()) + " " +
                format(now.getHours()) + ":" + format(now.getMinutes()) + ":" + format(now.getSeconds()) + "." + format(now.getMilliseconds(), 3) + "0"
            );
        }
    }
    
    class Lumberjack {
        async start(dir = ".") {
            try {
                var logs = await fs_promises.readdir(dir);

                var number = logs.filter(l => l.match(/^rto_\d+.log$/)).map(l => +l.split("_")[1].split(".")[0]).reduce((x, n) => Math.max(x, n), -1);

                this.console = new Console(fs.createWriteStream(dir + "/rto_" + (number + 1) + ".log"));

                return this;
            } catch (info) {
                try {
                    console.log("[] log 2: COULD NOT START LOGGING: " + JSON.stringify(info));
                } catch (info_x) {
                    // Ignore
                }
                
                process.exit(1);
            }
        }
        
        init(from) {
            var instance = new LogInstance(this.console, from);
            
            return {
                log_0: instance.log_0.bind(instance),
                log_1: instance.log_1.bind(instance),
                log_2: instance.log_2.bind(instance)
            };
        }
    }
    
    module.exports = new Lumberjack();
})();