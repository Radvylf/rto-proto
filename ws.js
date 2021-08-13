(() => {
    var n_ws = require("ws");
    
    var EventEmitter = require("events").EventEmitter;
    
    var MAX_PING = 40000;
    
    var log_0, log_1, log_2;
    
    class StartFailure extends Error {
        constructor() {
            super(...arguments);

            this.name = this.constructor.name;
        }
    }
    
    class Connection extends EventEmitter {
        constructor(connection, instance) {
            super();
            
            this.connection = connection;
            
            this.ping_stamp = Date.now();
            this.pong_stamp = Date.now();
            
            this.actor = null;
            
            connection.on("message", (message) => {
                var data;
                
                try {
                    data = JSON.parse(message.toString());
                    
                    log_0("instance (" + this.id + "): on.data: JSON: " + JSON.stringify(data));
                } catch (info) {
                    connection.close(1002, "Invalid JSON");
                    
                    log_0("instance (" + this.id + "): on.data: non-JSON: " + JSON.stringify(message));
                    log_0("instance (" + this.id + "): on.data: non-JSON info: " + JSON.stringify(info));
                    
                    return;
                }
                
                if (data == null || !("action" in data) || typeof data.action != "string"){
                    log_0("instance (" + this.id + "): invalid JSON format");
                    
                    connection.close(1002, "Invalid JSON format");
                    
                    return;
                }

                this.emit("data", data);
            });
            
            connection.on("error", (info) => {
                log_1("instance (" + this.id + "): on.error: " + JSON.stringify(info));
                
                connection.close(1002);
            });
            
            connection.on("close", (code, reason) => {
                log_1("instance (" + this.id + "): on.close: " + code + (reason ? ": " + reason : ""));
                
                this.emit("close");
            });
            
            this.on("data", (data) => {
                if (data.action == "pong") {
                    var now = Date.now();
                    
                    log_0("instance (" + this.id + "): action.pong: " + now);

                    this.pong_stamp = now;
                    
                    if (this.actor != null) {
                        log_0("actor (" + this.actor.id + "): action.pong: " + now);

                        this.actor.pong_stamp = now;
                    }
                }
            });
        }
        
        notify(data) {
            log_0("instance (" + this.id + "): notify: " + JSON.stringify(data));
            
            this.connection.send(data);
        }
        
        ping() {
            var now = Date.now();
            
            log_0("instance (" + this.id + "): ping: " + now);
            
            this.notify(JSON.stringify({
                action: "ping",
                data: {
                    now: now
                }
            }));
            
            this.ping_stamp = now;

            var confirm = () => {
                log_0("instance (" + this.id + "): confirming pong: " + Date.now());
                
                if (Date.now() - this.ping_stamp > MAX_PING && this.pong_stamp < this.ping_stamp) {
                    log_0("instance (" + this.id + "): did not pong");
                    
                    this.close(1002, "Did not pong");
                    
                    return;
                }
                
                log_0("instance (" + this.id + "): did pong");
            };
            
            setTimeout(confirm, MAX_PING);
            setTimeout(confirm, MAX_PING * 2);
        }
        
        close() {
            log_0("instance (" + this.id + "): close:", ...[...arguments].map(x => JSON.stringify(x)));
            
            this.connection.close(...arguments);
        }
    }
    
    var random = () => {
        var numbers = [
            "a", "b", "c", "d", "f", "g", "i", "j", "k", "n", "o",
            "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"
        ];

        return Array(8).fill(0).map(x => numbers[Math.random() * 22 | 0]).join("");
    };
    
    class Actor extends EventEmitter {
        constructor(instance) {
            super();
            
            this.instance = instance;
            this.connections = [];
            
            this.ping_stamp = Date.now();
            this.pong_stamp = Date.now();
            
            this.id = random();
            
            log_1("actor: " + this.id);
        }
        
        attach(connection) {
            this.connections.push(connection);
            
            log_1("actor (" + this.id + "): attach: " + connection.id);
            
            for (var old of this.connections.slice(0, -1)) {
                log_0("actor (" + this.id + "): old: " + old.id);
                
                old.close(1008);
            }
            
            connection.actor = this;
            
            connection.on("data", (data) => {
                switch (data.action) {
                    case "run":
                        log_0("actor (" + this.id + "): action.run: " + connection.id);
                        
                        this.emit("run", data.data, (response) => this.notify({
                            action: "respond",
                            data: {
                                to: "run",
                                response: response
                            }
                        }));
                        
                        break;
                    case "stop":
                        log_0("actor (" + this.id + "): action.stop: " + connection.id);
                        
                        this.emit("stop", (response) => this.notify({
                            action: "respond",
                            data: {
                                to: "stop",
                                response: response
                            }
                        }));
                        
                        break;
                }
            });
            
            connection.on("close", () => {
                log_0("actor (" + this.id + "): on.close: " + connection.id);
                
                var old_count = this.connections.length;
                
                this.connections = this.connections.filter(c => c != connection);
                
                log_0("actor (" + this.id + "): filter: " + old_count + " to " + this.connections.length);
            });
            
            this.instance.emit("actor", this);
        }
        
        notify(data) {
            log_0("actor (" + this.id + "): notify: " + JSON.stringify(data));
            
            for (var connection of this.connections)
                connection.notify(JSON.stringify(data));
        }
        
        ping() {
            var now = Date.now();
            
            log_0("actor (" + this.id + "): ping");
            
            for (var connection of this.connections)
                connection.ping();
            
            this.ping_stamp = now;

            var confirm = () => {
                log_0("actor (" + this.id + "): confirming pong: " + Date.now());
                
                if (Date.now() - this.ping_stamp > MAX_PING && this.pong_stamp < this.ping_stamp) {
                    log_0("actor (" + this.id + "): did not pong");
                    
                    this.disconnect("Did not pong");
                    
                    return;
                }
                
                log_0("actor (" + this.id + "): did pong");
            };
            
            setTimeout(confirm, MAX_PING);
            setTimeout(confirm, MAX_PING * 2);
        }
        
        disconnect(reason) {
            log_0("actor (" + this.id + "): disconnect" + (reason ? ": " + reason : ""));
            
            for (var connection of this.connections)
                connection.close(1002, ...(reason ? [reason] : []));
            
            var old_count = this.instance.actors.length;
            
            this.instance.actors = this.instance.actors.filter(c => c != this);
            
            log_0("filter actors: " + old_count + " to " + this.instance.actors.length);
        }
    }
    
    class WSInstance extends EventEmitter {
        constructor() {
            super();
            
            this.instance = null;
            this.status = -1;
            
            this.current_id = 0;
            this.actors = [];
            
            this.StartFailure = StartFailure;
        }
        
        init_log(log_library) {
            var init = log_library.init("ws");
            
            log_0 = init.log_0;
            log_1 = init.log_1;
            log_2 = init.log_2;
            
            log_0("confirm log_0");
            log_1("confirm log_1");
            log_2("confirm log_2");
        }
        
        async start(port = 8080, max_payload = null) {
            log_2("start: (port: " + port + ", max_payload: " + max_payload + ")");
            
            return new Promise((resolve, reject) => {
                var instance = new n_ws.Server(max_payload == null ? {
                    port: port,
                    host: "0.0.0.0"
                } : {
                    port: port,
                    host: "0.0.0.0",
                    maxPayload: max_payload
                });
                
                log_2("status: 0");
                
                this.instance = instance;
                this.status = 0;

                instance.on("listening", () => {
                    log_2("status: 1");
                    
                    this.status = 1;
                    
                    resolve();
                });
                
                instance.on("connection", (connection) => {
                    connection = new Connection(connection);
                    
                    connection.id = this.current_id++;
                    
                    log_1("incoming: " + connection.id);
                    
                    connection.on("data", (data) => {
                        if (data.action != "initial")
                            return;
                        
                        if (connection.actor != null || !("data" in data) || data.data == null || !("id" in data.data)) {
                            connection.close(1002, "Invalid initial action");
                            
                            return;
                        }
                        
                        log_1("initial: " + connection.id + ": " + JSON.stringify(data.data.id));
                        
                        var actor;
                        
                        if (data.data.id == null) {
                            actor = new Actor(this);
                            
                            actor.attach(connection);
                            
                            actor.notify({
                                action: "response",
                                data: {
                                    to: "initial",
                                    response: {
                                        id: actor.id
                                    }
                                }
                            });
                            
                            this.actors.push(actor);
                            
                            return;
                        }
                        
                        actor = this.actors.find(a => a.id == data.data.id);
                        
                        if (!actor) {
                            log_0("could not find actor: " + JSON.stringify(data.data.id));
                            
                            connection.close(1008);
                            
                            return;
                        }
                        
                        actor.attach(connection);
                    });
                });
                
                instance.on("error", (info) => {
                    if (this.status == 0) {
                        log_2("fail: " + JSON.stringify(info));
                        
                        reject(new StartFailure("WS failed to start"));
                        
                        this.emit("close");
                    }
                    
                    if (this.status == 1) {
                        this.status = 2;
                        
                        log_2("fail: " + JSON.stringify(info));
                        log_2("status: 2");
                        
                        instance.close();
                    }
                });
                
                instance.on("close", () => {
                    log_2("closing");
                    
                    this.emit("close");
                });
                
                setInterval(() => {
                    if (this.actors.length != 0) {
                        log_0("pinging: " + this.actors.length + " actors");

                        for (var actor of this.actors)
                            actor.ping();
                    }
                }, MAX_PING * 2);
                
                this.on("close", () => {
                    this.instance = null;
                    this.status = -1;
                    
                    this.current_id = 0;
                    this.actors = [];
                    
                    log_2("status: -1");
                });
            });
        }
    }
    
    module.exports = new WSInstance();
})();