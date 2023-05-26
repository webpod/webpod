import {Callback} from "./host.js";

export const tasks: {[key: string]: Callback<void>} = {}

export function task(name: string, fn: Callback<void>) {
  tasks[name] = fn
}
