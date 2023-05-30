import {Callback} from "./host.js";

export const allTasks: {[key: string]: Callback<void>} = {}

export function task(name: string, fn: Callback<void>) {
  allTasks[name] = fn
}
