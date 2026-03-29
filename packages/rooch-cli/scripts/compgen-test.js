"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var codegen_1 = require("@0xobelisk/common/codegen");
function init() {
    return __awaiter(this, void 0, void 0, function () {
        var config, output, a;
        return __generator(this, function (_a) {
            config = {
                name: "withinfinity",
                systems: [
                    "fee_system",
                    "home_system",
                    "pet_system",
                    "state_system",
                ],
                components: {
                    // Key - Struct value
                    level: {
                        hunger: "u64",
                        cleanliness: "u64",
                        mood: "u64",
                        level: "u64",
                    },
                    // Key - Struct value
                    state: {
                        state: "vector<u8>",
                        last_update_time: "u64",
                    },
                    // Key - Single value
                    suifren: "bool",
                },
            };
            output = "module eps::entity {\n    use sui::bag::Bag;\n    use sui::bag;\n    use sui::tx_context::TxContext;\n\n    struct Entity has store  {\n        components: Bag\n    }\n\n    public fun create_entity(ctx: &mut TxContext): Entity {\n        Entity {\n            components: bag::new(ctx)\n        }\n    }\n\n    public fun add_comp<T: store>(entity: &mut Entity, component_id: vector<u8>, component:T){\n        let components = get_mut_comps(entity);\n        bag::add(components, component_id, component);\n    }\n\n    public fun remove_component<T: drop + store>(entity: &mut Entity, component_id: vector<u8>){\n        let components= get_mut_comps(entity);\n        bag::remove<vector<u8>,T>(components, component_id);\n    }\n\n    public fun get_mut_comps(entity: &mut Entity): &mut Bag {\n        &mut entity.components\n    }\n\n    public fun get_comp<T: store>(entity: &Entity, component_id: vector<u8>): &T {\n        assert!(bag::contains(&entity.components, component_id),0);\n        bag::borrow<vector<u8>,T>(&entity.components, component_id)\n    }\n\n    public fun get_mut_comp<T: store>(entity: &mut Entity, component_id: vector<u8>): &mut T {\n        assert!(bag::contains(&entity.components, component_id),0);\n        bag::borrow_mut<vector<u8>,T>(&mut entity.components,component_id)\n    }\n\n    public fun components_length(entity: &mut Entity) : u64 {\n        bag::length(get_mut_comps(entity))\n    }\n}";
            a = (0, codegen_1.formatAndWriteMove)(output, "/packages/cli", "formatAndWriteMove");
            return [2 /*return*/];
        });
    });
}
init();
