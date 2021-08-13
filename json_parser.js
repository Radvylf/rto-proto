(() => {
    var fs = require("fs");
    
    var interpreters = JSON.parse(fs.readFileSync("interpreters.json", "utf8"));
    
    class InvalidJSON extends Error {
        constructor() {
            super(...arguments);

            this.name = this.constructor.name;
            this.notify = this.message;
        }
    }
    
    var current_format = 0;
    
    var type = (json) => {
        if (json === null)
            return "null";
        
        if (Array.isArray(json))
            return "array";
        
        return typeof json;
    };
    
    var identical = (j_0, j_1) => {
        var objects_identical = (o_0, o_1) => {
            var k_0 = Object.keys(o_0);
            var k_1 = Object.keys(o_1);
            
            if (k_0.some(k => !k_1.includes(k)) || k_1.some(k => !k_0.includes(k)))
                return false;
            
            for (var k of k_0)
                if (!identical(o_0[k], o_1[k]))
                    return false;
            
            return true;
        };
        
        if (type(j_0) != type(j_1))
            return false;
        
        switch (type(j_0)) {
            case "number":
            case "string":
            case "boolean":
                return j_0 == j_1;
            case "array":
                if (j_0.length != j_1.length)
                    return false;
                
                return !j_0.some(j => !identical(j, j_1));
            case "object":
                return objects_identical(j_0, j_1);
        }
    };
    
    // Inherits: All properties in from are present in (and identical to) those in json
    
    var inherits = (json, from) => {
        for (var property in from)
            if (!(property in json) || !identical(json[property], from[property]))
                return false;
        
        return true;
    };
    
    var confirm_input = (json) => {
        if (type(json) != "object")
            throw new InvalidJSON("Invalid inputJSON");
        
        if (!("language" in json) || type(json.language) != "string")
            throw new InvalidJSON("Invalid inputJSON");

        if (!("interpreter" in json) || type(json.interpreter) != "object")
            throw new InvalidJSON("Invalid inputJSON");
        
        if (!(json.language in interpreters))
            throw new InvalidJSON("Could not find interpreter");
        
        var interpreter = interpreters[json.language];
        
        var container = interpreter.containers.find((i_data) => inherits(json.interpreter, i_data.description));
        
        if (!container)
            throw new InvalidJSON("Could not find interpreter");

        if (!("code" in json) || type(json.code) != "string")
            throw new InvalidJSON("Invalid inputJSON");

        if (!("input" in json) || type(json.input) != "string")
            throw new InvalidJSON("Invalid inputJSON");

        if (!("options" in json) || type(json.options) != interpreter.options_format)
            throw new InvalidJSON("Invalid inputJSON");
        
        var confirm_misc = (misc, reference) => {
            var confirm_input = (misc_input, reference) => {
                switch (reference.type) {
                    case "input":
                        return type(misc_input) == "string";
                    case "binary":
                        return type(misc_input) == "boolean";
                    case "options":
                        return reference.options.includes(misc_input);
                }
            };

            for (var input in reference)
                if (!(input in misc) || !confirm_input(misc[input], reference[input]))
                    return false;

            return true;
        };

        if ("misc_format" in interpreter)
            if (!("misc" in json) || type(json.misc) != "object" || !confirm_misc(json.misc, interpreter.misc_format))
                throw new InvalidJSON("Invalid inputJSON (.misc)");

        return {
            language: interpreter,
            interpreter: container
        };
    };
    
    var confirm_output = (json, interpreter, format) => {
        if (format == 0) {
            if (type(json) != "object")
                return false;
            
            var confirm_format = (output) => {
                if (type(output) == "array")
                    return !output.some(o => type(o) != "object" || !confirm_format(o));
                
                if (type(output) != "object")
                    return false;
                
                if (!("raw" in output) || type(output.raw) != "string")
                    return false;
                
                if ("format" in output && (type(output.format) != "string" || !["normal", "red"].includes(output.format)))
                    return false;
                
                return true;
            };
            
            for (var output in json)
                if (!interpreter.outputs.includes(output) || !confirm_format(json[output]))
                    return false;
            
            return true;
        }
    };
    
    var input_to_format = (json, format) => {
        if (format == 0) {
            return json;
        }
    };
    
    var output_from_format = (json, format) => {
        if (format == 0) {
            return json;
        }
    };
    
    module.exports = {
        current_format: current_format,
        interpreters: interpreters,
        confirm_input: confirm_input,
        confirm_output: confirm_output,
        input_to_format: input_to_format,
        output_from_format: output_from_format
    };
})();