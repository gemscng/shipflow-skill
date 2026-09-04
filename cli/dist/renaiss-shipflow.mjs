#!/usr/bin/env node
import { createRequire } from "node:module";
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __toESM = (mod, isNodeMode, target) => {
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: () => mod[key],
        enumerable: true
      });
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: (newValue) => all[name] = () => newValue
    });
};
var __esm = (fn, res) => () => (fn && (res = fn(fn = 0)), res);
var __require = /* @__PURE__ */ createRequire(import.meta.url);

// ../../node_modules/commander/lib/error.js
var require_error = __commonJS((exports) => {
  class CommanderError extends Error {
    constructor(exitCode, code, message) {
      super(message);
      Error.captureStackTrace(this, this.constructor);
      this.name = this.constructor.name;
      this.code = code;
      this.exitCode = exitCode;
      this.nestedError = undefined;
    }
  }

  class InvalidArgumentError extends CommanderError {
    constructor(message) {
      super(1, "commander.invalidArgument", message);
      Error.captureStackTrace(this, this.constructor);
      this.name = this.constructor.name;
    }
  }
  exports.CommanderError = CommanderError;
  exports.InvalidArgumentError = InvalidArgumentError;
});

// ../../node_modules/commander/lib/argument.js
var require_argument = __commonJS((exports) => {
  var { InvalidArgumentError } = require_error();

  class Argument {
    constructor(name, description) {
      this.description = description || "";
      this.variadic = false;
      this.parseArg = undefined;
      this.defaultValue = undefined;
      this.defaultValueDescription = undefined;
      this.argChoices = undefined;
      switch (name[0]) {
        case "<":
          this.required = true;
          this._name = name.slice(1, -1);
          break;
        case "[":
          this.required = false;
          this._name = name.slice(1, -1);
          break;
        default:
          this.required = true;
          this._name = name;
          break;
      }
      if (this._name.length > 3 && this._name.slice(-3) === "...") {
        this.variadic = true;
        this._name = this._name.slice(0, -3);
      }
    }
    name() {
      return this._name;
    }
    _concatValue(value, previous) {
      if (previous === this.defaultValue || !Array.isArray(previous)) {
        return [value];
      }
      return previous.concat(value);
    }
    default(value, description) {
      this.defaultValue = value;
      this.defaultValueDescription = description;
      return this;
    }
    argParser(fn) {
      this.parseArg = fn;
      return this;
    }
    choices(values) {
      this.argChoices = values.slice();
      this.parseArg = (arg, previous) => {
        if (!this.argChoices.includes(arg)) {
          throw new InvalidArgumentError(`Allowed choices are ${this.argChoices.join(", ")}.`);
        }
        if (this.variadic) {
          return this._concatValue(arg, previous);
        }
        return arg;
      };
      return this;
    }
    argRequired() {
      this.required = true;
      return this;
    }
    argOptional() {
      this.required = false;
      return this;
    }
  }
  function humanReadableArgName(arg) {
    const nameOutput = arg.name() + (arg.variadic === true ? "..." : "");
    return arg.required ? "<" + nameOutput + ">" : "[" + nameOutput + "]";
  }
  exports.Argument = Argument;
  exports.humanReadableArgName = humanReadableArgName;
});

// ../../node_modules/commander/lib/help.js
var require_help = __commonJS((exports) => {
  var { humanReadableArgName } = require_argument();

  class Help {
    constructor() {
      this.helpWidth = undefined;
      this.minWidthToWrap = 40;
      this.sortSubcommands = false;
      this.sortOptions = false;
      this.showGlobalOptions = false;
    }
    prepareContext(contextOptions) {
      this.helpWidth = this.helpWidth ?? contextOptions.helpWidth ?? 80;
    }
    visibleCommands(cmd) {
      const visibleCommands = cmd.commands.filter((cmd2) => !cmd2._hidden);
      const helpCommand = cmd._getHelpCommand();
      if (helpCommand && !helpCommand._hidden) {
        visibleCommands.push(helpCommand);
      }
      if (this.sortSubcommands) {
        visibleCommands.sort((a, b) => {
          return a.name().localeCompare(b.name());
        });
      }
      return visibleCommands;
    }
    compareOptions(a, b) {
      const getSortKey = (option) => {
        return option.short ? option.short.replace(/^-/, "") : option.long.replace(/^--/, "");
      };
      return getSortKey(a).localeCompare(getSortKey(b));
    }
    visibleOptions(cmd) {
      const visibleOptions = cmd.options.filter((option) => !option.hidden);
      const helpOption = cmd._getHelpOption();
      if (helpOption && !helpOption.hidden) {
        const removeShort = helpOption.short && cmd._findOption(helpOption.short);
        const removeLong = helpOption.long && cmd._findOption(helpOption.long);
        if (!removeShort && !removeLong) {
          visibleOptions.push(helpOption);
        } else if (helpOption.long && !removeLong) {
          visibleOptions.push(cmd.createOption(helpOption.long, helpOption.description));
        } else if (helpOption.short && !removeShort) {
          visibleOptions.push(cmd.createOption(helpOption.short, helpOption.description));
        }
      }
      if (this.sortOptions) {
        visibleOptions.sort(this.compareOptions);
      }
      return visibleOptions;
    }
    visibleGlobalOptions(cmd) {
      if (!this.showGlobalOptions)
        return [];
      const globalOptions = [];
      for (let ancestorCmd = cmd.parent;ancestorCmd; ancestorCmd = ancestorCmd.parent) {
        const visibleOptions = ancestorCmd.options.filter((option) => !option.hidden);
        globalOptions.push(...visibleOptions);
      }
      if (this.sortOptions) {
        globalOptions.sort(this.compareOptions);
      }
      return globalOptions;
    }
    visibleArguments(cmd) {
      if (cmd._argsDescription) {
        cmd.registeredArguments.forEach((argument) => {
          argument.description = argument.description || cmd._argsDescription[argument.name()] || "";
        });
      }
      if (cmd.registeredArguments.find((argument) => argument.description)) {
        return cmd.registeredArguments;
      }
      return [];
    }
    subcommandTerm(cmd) {
      const args = cmd.registeredArguments.map((arg) => humanReadableArgName(arg)).join(" ");
      return cmd._name + (cmd._aliases[0] ? "|" + cmd._aliases[0] : "") + (cmd.options.length ? " [options]" : "") + (args ? " " + args : "");
    }
    optionTerm(option) {
      return option.flags;
    }
    argumentTerm(argument) {
      return argument.name();
    }
    longestSubcommandTermLength(cmd, helper) {
      return helper.visibleCommands(cmd).reduce((max, command) => {
        return Math.max(max, this.displayWidth(helper.styleSubcommandTerm(helper.subcommandTerm(command))));
      }, 0);
    }
    longestOptionTermLength(cmd, helper) {
      return helper.visibleOptions(cmd).reduce((max, option) => {
        return Math.max(max, this.displayWidth(helper.styleOptionTerm(helper.optionTerm(option))));
      }, 0);
    }
    longestGlobalOptionTermLength(cmd, helper) {
      return helper.visibleGlobalOptions(cmd).reduce((max, option) => {
        return Math.max(max, this.displayWidth(helper.styleOptionTerm(helper.optionTerm(option))));
      }, 0);
    }
    longestArgumentTermLength(cmd, helper) {
      return helper.visibleArguments(cmd).reduce((max, argument) => {
        return Math.max(max, this.displayWidth(helper.styleArgumentTerm(helper.argumentTerm(argument))));
      }, 0);
    }
    commandUsage(cmd) {
      let cmdName = cmd._name;
      if (cmd._aliases[0]) {
        cmdName = cmdName + "|" + cmd._aliases[0];
      }
      let ancestorCmdNames = "";
      for (let ancestorCmd = cmd.parent;ancestorCmd; ancestorCmd = ancestorCmd.parent) {
        ancestorCmdNames = ancestorCmd.name() + " " + ancestorCmdNames;
      }
      return ancestorCmdNames + cmdName + " " + cmd.usage();
    }
    commandDescription(cmd) {
      return cmd.description();
    }
    subcommandDescription(cmd) {
      return cmd.summary() || cmd.description();
    }
    optionDescription(option) {
      const extraInfo = [];
      if (option.argChoices) {
        extraInfo.push(`choices: ${option.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`);
      }
      if (option.defaultValue !== undefined) {
        const showDefault = option.required || option.optional || option.isBoolean() && typeof option.defaultValue === "boolean";
        if (showDefault) {
          extraInfo.push(`default: ${option.defaultValueDescription || JSON.stringify(option.defaultValue)}`);
        }
      }
      if (option.presetArg !== undefined && option.optional) {
        extraInfo.push(`preset: ${JSON.stringify(option.presetArg)}`);
      }
      if (option.envVar !== undefined) {
        extraInfo.push(`env: ${option.envVar}`);
      }
      if (extraInfo.length > 0) {
        return `${option.description} (${extraInfo.join(", ")})`;
      }
      return option.description;
    }
    argumentDescription(argument) {
      const extraInfo = [];
      if (argument.argChoices) {
        extraInfo.push(`choices: ${argument.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`);
      }
      if (argument.defaultValue !== undefined) {
        extraInfo.push(`default: ${argument.defaultValueDescription || JSON.stringify(argument.defaultValue)}`);
      }
      if (extraInfo.length > 0) {
        const extraDescription = `(${extraInfo.join(", ")})`;
        if (argument.description) {
          return `${argument.description} ${extraDescription}`;
        }
        return extraDescription;
      }
      return argument.description;
    }
    formatHelp(cmd, helper) {
      const termWidth = helper.padWidth(cmd, helper);
      const helpWidth = helper.helpWidth ?? 80;
      function callFormatItem(term, description) {
        return helper.formatItem(term, termWidth, description, helper);
      }
      let output = [
        `${helper.styleTitle("Usage:")} ${helper.styleUsage(helper.commandUsage(cmd))}`,
        ""
      ];
      const commandDescription = helper.commandDescription(cmd);
      if (commandDescription.length > 0) {
        output = output.concat([
          helper.boxWrap(helper.styleCommandDescription(commandDescription), helpWidth),
          ""
        ]);
      }
      const argumentList = helper.visibleArguments(cmd).map((argument) => {
        return callFormatItem(helper.styleArgumentTerm(helper.argumentTerm(argument)), helper.styleArgumentDescription(helper.argumentDescription(argument)));
      });
      if (argumentList.length > 0) {
        output = output.concat([
          helper.styleTitle("Arguments:"),
          ...argumentList,
          ""
        ]);
      }
      const optionList = helper.visibleOptions(cmd).map((option) => {
        return callFormatItem(helper.styleOptionTerm(helper.optionTerm(option)), helper.styleOptionDescription(helper.optionDescription(option)));
      });
      if (optionList.length > 0) {
        output = output.concat([
          helper.styleTitle("Options:"),
          ...optionList,
          ""
        ]);
      }
      if (helper.showGlobalOptions) {
        const globalOptionList = helper.visibleGlobalOptions(cmd).map((option) => {
          return callFormatItem(helper.styleOptionTerm(helper.optionTerm(option)), helper.styleOptionDescription(helper.optionDescription(option)));
        });
        if (globalOptionList.length > 0) {
          output = output.concat([
            helper.styleTitle("Global Options:"),
            ...globalOptionList,
            ""
          ]);
        }
      }
      const commandList = helper.visibleCommands(cmd).map((cmd2) => {
        return callFormatItem(helper.styleSubcommandTerm(helper.subcommandTerm(cmd2)), helper.styleSubcommandDescription(helper.subcommandDescription(cmd2)));
      });
      if (commandList.length > 0) {
        output = output.concat([
          helper.styleTitle("Commands:"),
          ...commandList,
          ""
        ]);
      }
      return output.join(`
`);
    }
    displayWidth(str) {
      return stripColor(str).length;
    }
    styleTitle(str) {
      return str;
    }
    styleUsage(str) {
      return str.split(" ").map((word) => {
        if (word === "[options]")
          return this.styleOptionText(word);
        if (word === "[command]")
          return this.styleSubcommandText(word);
        if (word[0] === "[" || word[0] === "<")
          return this.styleArgumentText(word);
        return this.styleCommandText(word);
      }).join(" ");
    }
    styleCommandDescription(str) {
      return this.styleDescriptionText(str);
    }
    styleOptionDescription(str) {
      return this.styleDescriptionText(str);
    }
    styleSubcommandDescription(str) {
      return this.styleDescriptionText(str);
    }
    styleArgumentDescription(str) {
      return this.styleDescriptionText(str);
    }
    styleDescriptionText(str) {
      return str;
    }
    styleOptionTerm(str) {
      return this.styleOptionText(str);
    }
    styleSubcommandTerm(str) {
      return str.split(" ").map((word) => {
        if (word === "[options]")
          return this.styleOptionText(word);
        if (word[0] === "[" || word[0] === "<")
          return this.styleArgumentText(word);
        return this.styleSubcommandText(word);
      }).join(" ");
    }
    styleArgumentTerm(str) {
      return this.styleArgumentText(str);
    }
    styleOptionText(str) {
      return str;
    }
    styleArgumentText(str) {
      return str;
    }
    styleSubcommandText(str) {
      return str;
    }
    styleCommandText(str) {
      return str;
    }
    padWidth(cmd, helper) {
      return Math.max(helper.longestOptionTermLength(cmd, helper), helper.longestGlobalOptionTermLength(cmd, helper), helper.longestSubcommandTermLength(cmd, helper), helper.longestArgumentTermLength(cmd, helper));
    }
    preformatted(str) {
      return /\n[^\S\r\n]/.test(str);
    }
    formatItem(term, termWidth, description, helper) {
      const itemIndent = 2;
      const itemIndentStr = " ".repeat(itemIndent);
      if (!description)
        return itemIndentStr + term;
      const paddedTerm = term.padEnd(termWidth + term.length - helper.displayWidth(term));
      const spacerWidth = 2;
      const helpWidth = this.helpWidth ?? 80;
      const remainingWidth = helpWidth - termWidth - spacerWidth - itemIndent;
      let formattedDescription;
      if (remainingWidth < this.minWidthToWrap || helper.preformatted(description)) {
        formattedDescription = description;
      } else {
        const wrappedDescription = helper.boxWrap(description, remainingWidth);
        formattedDescription = wrappedDescription.replace(/\n/g, `
` + " ".repeat(termWidth + spacerWidth));
      }
      return itemIndentStr + paddedTerm + " ".repeat(spacerWidth) + formattedDescription.replace(/\n/g, `
${itemIndentStr}`);
    }
    boxWrap(str, width) {
      if (width < this.minWidthToWrap)
        return str;
      const rawLines = str.split(/\r\n|\n/);
      const chunkPattern = /[\s]*[^\s]+/g;
      const wrappedLines = [];
      rawLines.forEach((line) => {
        const chunks = line.match(chunkPattern);
        if (chunks === null) {
          wrappedLines.push("");
          return;
        }
        let sumChunks = [chunks.shift()];
        let sumWidth = this.displayWidth(sumChunks[0]);
        chunks.forEach((chunk) => {
          const visibleWidth = this.displayWidth(chunk);
          if (sumWidth + visibleWidth <= width) {
            sumChunks.push(chunk);
            sumWidth += visibleWidth;
            return;
          }
          wrappedLines.push(sumChunks.join(""));
          const nextChunk = chunk.trimStart();
          sumChunks = [nextChunk];
          sumWidth = this.displayWidth(nextChunk);
        });
        wrappedLines.push(sumChunks.join(""));
      });
      return wrappedLines.join(`
`);
    }
  }
  function stripColor(str) {
    const sgrPattern = /\x1b\[\d*(;\d*)*m/g;
    return str.replace(sgrPattern, "");
  }
  exports.Help = Help;
  exports.stripColor = stripColor;
});

// ../../node_modules/commander/lib/option.js
var require_option = __commonJS((exports) => {
  var { InvalidArgumentError } = require_error();

  class Option {
    constructor(flags, description) {
      this.flags = flags;
      this.description = description || "";
      this.required = flags.includes("<");
      this.optional = flags.includes("[");
      this.variadic = /\w\.\.\.[>\]]$/.test(flags);
      this.mandatory = false;
      const optionFlags = splitOptionFlags(flags);
      this.short = optionFlags.shortFlag;
      this.long = optionFlags.longFlag;
      this.negate = false;
      if (this.long) {
        this.negate = this.long.startsWith("--no-");
      }
      this.defaultValue = undefined;
      this.defaultValueDescription = undefined;
      this.presetArg = undefined;
      this.envVar = undefined;
      this.parseArg = undefined;
      this.hidden = false;
      this.argChoices = undefined;
      this.conflictsWith = [];
      this.implied = undefined;
    }
    default(value, description) {
      this.defaultValue = value;
      this.defaultValueDescription = description;
      return this;
    }
    preset(arg) {
      this.presetArg = arg;
      return this;
    }
    conflicts(names) {
      this.conflictsWith = this.conflictsWith.concat(names);
      return this;
    }
    implies(impliedOptionValues) {
      let newImplied = impliedOptionValues;
      if (typeof impliedOptionValues === "string") {
        newImplied = { [impliedOptionValues]: true };
      }
      this.implied = Object.assign(this.implied || {}, newImplied);
      return this;
    }
    env(name) {
      this.envVar = name;
      return this;
    }
    argParser(fn) {
      this.parseArg = fn;
      return this;
    }
    makeOptionMandatory(mandatory = true) {
      this.mandatory = !!mandatory;
      return this;
    }
    hideHelp(hide = true) {
      this.hidden = !!hide;
      return this;
    }
    _concatValue(value, previous) {
      if (previous === this.defaultValue || !Array.isArray(previous)) {
        return [value];
      }
      return previous.concat(value);
    }
    choices(values) {
      this.argChoices = values.slice();
      this.parseArg = (arg, previous) => {
        if (!this.argChoices.includes(arg)) {
          throw new InvalidArgumentError(`Allowed choices are ${this.argChoices.join(", ")}.`);
        }
        if (this.variadic) {
          return this._concatValue(arg, previous);
        }
        return arg;
      };
      return this;
    }
    name() {
      if (this.long) {
        return this.long.replace(/^--/, "");
      }
      return this.short.replace(/^-/, "");
    }
    attributeName() {
      if (this.negate) {
        return camelcase(this.name().replace(/^no-/, ""));
      }
      return camelcase(this.name());
    }
    is(arg) {
      return this.short === arg || this.long === arg;
    }
    isBoolean() {
      return !this.required && !this.optional && !this.negate;
    }
  }

  class DualOptions {
    constructor(options) {
      this.positiveOptions = new Map;
      this.negativeOptions = new Map;
      this.dualOptions = new Set;
      options.forEach((option) => {
        if (option.negate) {
          this.negativeOptions.set(option.attributeName(), option);
        } else {
          this.positiveOptions.set(option.attributeName(), option);
        }
      });
      this.negativeOptions.forEach((value, key) => {
        if (this.positiveOptions.has(key)) {
          this.dualOptions.add(key);
        }
      });
    }
    valueFromOption(value, option) {
      const optionKey = option.attributeName();
      if (!this.dualOptions.has(optionKey))
        return true;
      const preset = this.negativeOptions.get(optionKey).presetArg;
      const negativeValue = preset !== undefined ? preset : false;
      return option.negate === (negativeValue === value);
    }
  }
  function camelcase(str) {
    return str.split("-").reduce((str2, word) => {
      return str2 + word[0].toUpperCase() + word.slice(1);
    });
  }
  function splitOptionFlags(flags) {
    let shortFlag;
    let longFlag;
    const shortFlagExp = /^-[^-]$/;
    const longFlagExp = /^--[^-]/;
    const flagParts = flags.split(/[ |,]+/).concat("guard");
    if (shortFlagExp.test(flagParts[0]))
      shortFlag = flagParts.shift();
    if (longFlagExp.test(flagParts[0]))
      longFlag = flagParts.shift();
    if (!shortFlag && shortFlagExp.test(flagParts[0]))
      shortFlag = flagParts.shift();
    if (!shortFlag && longFlagExp.test(flagParts[0])) {
      shortFlag = longFlag;
      longFlag = flagParts.shift();
    }
    if (flagParts[0].startsWith("-")) {
      const unsupportedFlag = flagParts[0];
      const baseError = `option creation failed due to '${unsupportedFlag}' in option flags '${flags}'`;
      if (/^-[^-][^-]/.test(unsupportedFlag))
        throw new Error(`${baseError}
- a short flag is a single dash and a single character
  - either use a single dash and a single character (for a short flag)
  - or use a double dash for a long option (and can have two, like '--ws, --workspace')`);
      if (shortFlagExp.test(unsupportedFlag))
        throw new Error(`${baseError}
- too many short flags`);
      if (longFlagExp.test(unsupportedFlag))
        throw new Error(`${baseError}
- too many long flags`);
      throw new Error(`${baseError}
- unrecognised flag format`);
    }
    if (shortFlag === undefined && longFlag === undefined)
      throw new Error(`option creation failed due to no flags found in '${flags}'.`);
    return { shortFlag, longFlag };
  }
  exports.Option = Option;
  exports.DualOptions = DualOptions;
});

// ../../node_modules/commander/lib/suggestSimilar.js
var require_suggestSimilar = __commonJS((exports) => {
  var maxDistance = 3;
  function editDistance(a, b) {
    if (Math.abs(a.length - b.length) > maxDistance)
      return Math.max(a.length, b.length);
    const d = [];
    for (let i = 0;i <= a.length; i++) {
      d[i] = [i];
    }
    for (let j = 0;j <= b.length; j++) {
      d[0][j] = j;
    }
    for (let j = 1;j <= b.length; j++) {
      for (let i = 1;i <= a.length; i++) {
        let cost = 1;
        if (a[i - 1] === b[j - 1]) {
          cost = 0;
        } else {
          cost = 1;
        }
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
        }
      }
    }
    return d[a.length][b.length];
  }
  function suggestSimilar(word, candidates) {
    if (!candidates || candidates.length === 0)
      return "";
    candidates = Array.from(new Set(candidates));
    const searchingOptions = word.startsWith("--");
    if (searchingOptions) {
      word = word.slice(2);
      candidates = candidates.map((candidate) => candidate.slice(2));
    }
    let similar = [];
    let bestDistance = maxDistance;
    const minSimilarity = 0.4;
    candidates.forEach((candidate) => {
      if (candidate.length <= 1)
        return;
      const distance = editDistance(word, candidate);
      const length = Math.max(word.length, candidate.length);
      const similarity = (length - distance) / length;
      if (similarity > minSimilarity) {
        if (distance < bestDistance) {
          bestDistance = distance;
          similar = [candidate];
        } else if (distance === bestDistance) {
          similar.push(candidate);
        }
      }
    });
    similar.sort((a, b) => a.localeCompare(b));
    if (searchingOptions) {
      similar = similar.map((candidate) => `--${candidate}`);
    }
    if (similar.length > 1) {
      return `
(Did you mean one of ${similar.join(", ")}?)`;
    }
    if (similar.length === 1) {
      return `
(Did you mean ${similar[0]}?)`;
    }
    return "";
  }
  exports.suggestSimilar = suggestSimilar;
});

// ../../node_modules/commander/lib/command.js
var require_command = __commonJS((exports) => {
  var EventEmitter = __require("node:events").EventEmitter;
  var childProcess = __require("node:child_process");
  var path = __require("node:path");
  var fs = __require("node:fs");
  var process2 = __require("node:process");
  var { Argument, humanReadableArgName } = require_argument();
  var { CommanderError } = require_error();
  var { Help, stripColor } = require_help();
  var { Option, DualOptions } = require_option();
  var { suggestSimilar } = require_suggestSimilar();

  class Command extends EventEmitter {
    constructor(name) {
      super();
      this.commands = [];
      this.options = [];
      this.parent = null;
      this._allowUnknownOption = false;
      this._allowExcessArguments = false;
      this.registeredArguments = [];
      this._args = this.registeredArguments;
      this.args = [];
      this.rawArgs = [];
      this.processedArgs = [];
      this._scriptPath = null;
      this._name = name || "";
      this._optionValues = {};
      this._optionValueSources = {};
      this._storeOptionsAsProperties = false;
      this._actionHandler = null;
      this._executableHandler = false;
      this._executableFile = null;
      this._executableDir = null;
      this._defaultCommandName = null;
      this._exitCallback = null;
      this._aliases = [];
      this._combineFlagAndOptionalValue = true;
      this._description = "";
      this._summary = "";
      this._argsDescription = undefined;
      this._enablePositionalOptions = false;
      this._passThroughOptions = false;
      this._lifeCycleHooks = {};
      this._showHelpAfterError = false;
      this._showSuggestionAfterError = true;
      this._savedState = null;
      this._outputConfiguration = {
        writeOut: (str) => process2.stdout.write(str),
        writeErr: (str) => process2.stderr.write(str),
        outputError: (str, write) => write(str),
        getOutHelpWidth: () => process2.stdout.isTTY ? process2.stdout.columns : undefined,
        getErrHelpWidth: () => process2.stderr.isTTY ? process2.stderr.columns : undefined,
        getOutHasColors: () => useColor() ?? (process2.stdout.isTTY && process2.stdout.hasColors?.()),
        getErrHasColors: () => useColor() ?? (process2.stderr.isTTY && process2.stderr.hasColors?.()),
        stripColor: (str) => stripColor(str)
      };
      this._hidden = false;
      this._helpOption = undefined;
      this._addImplicitHelpCommand = undefined;
      this._helpCommand = undefined;
      this._helpConfiguration = {};
    }
    copyInheritedSettings(sourceCommand) {
      this._outputConfiguration = sourceCommand._outputConfiguration;
      this._helpOption = sourceCommand._helpOption;
      this._helpCommand = sourceCommand._helpCommand;
      this._helpConfiguration = sourceCommand._helpConfiguration;
      this._exitCallback = sourceCommand._exitCallback;
      this._storeOptionsAsProperties = sourceCommand._storeOptionsAsProperties;
      this._combineFlagAndOptionalValue = sourceCommand._combineFlagAndOptionalValue;
      this._allowExcessArguments = sourceCommand._allowExcessArguments;
      this._enablePositionalOptions = sourceCommand._enablePositionalOptions;
      this._showHelpAfterError = sourceCommand._showHelpAfterError;
      this._showSuggestionAfterError = sourceCommand._showSuggestionAfterError;
      return this;
    }
    _getCommandAndAncestors() {
      const result = [];
      for (let command = this;command; command = command.parent) {
        result.push(command);
      }
      return result;
    }
    command(nameAndArgs, actionOptsOrExecDesc, execOpts) {
      let desc = actionOptsOrExecDesc;
      let opts = execOpts;
      if (typeof desc === "object" && desc !== null) {
        opts = desc;
        desc = null;
      }
      opts = opts || {};
      const [, name, args] = nameAndArgs.match(/([^ ]+) *(.*)/);
      const cmd = this.createCommand(name);
      if (desc) {
        cmd.description(desc);
        cmd._executableHandler = true;
      }
      if (opts.isDefault)
        this._defaultCommandName = cmd._name;
      cmd._hidden = !!(opts.noHelp || opts.hidden);
      cmd._executableFile = opts.executableFile || null;
      if (args)
        cmd.arguments(args);
      this._registerCommand(cmd);
      cmd.parent = this;
      cmd.copyInheritedSettings(this);
      if (desc)
        return this;
      return cmd;
    }
    createCommand(name) {
      return new Command(name);
    }
    createHelp() {
      return Object.assign(new Help, this.configureHelp());
    }
    configureHelp(configuration) {
      if (configuration === undefined)
        return this._helpConfiguration;
      this._helpConfiguration = configuration;
      return this;
    }
    configureOutput(configuration) {
      if (configuration === undefined)
        return this._outputConfiguration;
      Object.assign(this._outputConfiguration, configuration);
      return this;
    }
    showHelpAfterError(displayHelp = true) {
      if (typeof displayHelp !== "string")
        displayHelp = !!displayHelp;
      this._showHelpAfterError = displayHelp;
      return this;
    }
    showSuggestionAfterError(displaySuggestion = true) {
      this._showSuggestionAfterError = !!displaySuggestion;
      return this;
    }
    addCommand(cmd, opts) {
      if (!cmd._name) {
        throw new Error(`Command passed to .addCommand() must have a name
- specify the name in Command constructor or using .name()`);
      }
      opts = opts || {};
      if (opts.isDefault)
        this._defaultCommandName = cmd._name;
      if (opts.noHelp || opts.hidden)
        cmd._hidden = true;
      this._registerCommand(cmd);
      cmd.parent = this;
      cmd._checkForBrokenPassThrough();
      return this;
    }
    createArgument(name, description) {
      return new Argument(name, description);
    }
    argument(name, description, fn, defaultValue) {
      const argument = this.createArgument(name, description);
      if (typeof fn === "function") {
        argument.default(defaultValue).argParser(fn);
      } else {
        argument.default(fn);
      }
      this.addArgument(argument);
      return this;
    }
    arguments(names) {
      names.trim().split(/ +/).forEach((detail) => {
        this.argument(detail);
      });
      return this;
    }
    addArgument(argument) {
      const previousArgument = this.registeredArguments.slice(-1)[0];
      if (previousArgument && previousArgument.variadic) {
        throw new Error(`only the last argument can be variadic '${previousArgument.name()}'`);
      }
      if (argument.required && argument.defaultValue !== undefined && argument.parseArg === undefined) {
        throw new Error(`a default value for a required argument is never used: '${argument.name()}'`);
      }
      this.registeredArguments.push(argument);
      return this;
    }
    helpCommand(enableOrNameAndArgs, description) {
      if (typeof enableOrNameAndArgs === "boolean") {
        this._addImplicitHelpCommand = enableOrNameAndArgs;
        return this;
      }
      enableOrNameAndArgs = enableOrNameAndArgs ?? "help [command]";
      const [, helpName, helpArgs] = enableOrNameAndArgs.match(/([^ ]+) *(.*)/);
      const helpDescription = description ?? "display help for command";
      const helpCommand = this.createCommand(helpName);
      helpCommand.helpOption(false);
      if (helpArgs)
        helpCommand.arguments(helpArgs);
      if (helpDescription)
        helpCommand.description(helpDescription);
      this._addImplicitHelpCommand = true;
      this._helpCommand = helpCommand;
      return this;
    }
    addHelpCommand(helpCommand, deprecatedDescription) {
      if (typeof helpCommand !== "object") {
        this.helpCommand(helpCommand, deprecatedDescription);
        return this;
      }
      this._addImplicitHelpCommand = true;
      this._helpCommand = helpCommand;
      return this;
    }
    _getHelpCommand() {
      const hasImplicitHelpCommand = this._addImplicitHelpCommand ?? (this.commands.length && !this._actionHandler && !this._findCommand("help"));
      if (hasImplicitHelpCommand) {
        if (this._helpCommand === undefined) {
          this.helpCommand(undefined, undefined);
        }
        return this._helpCommand;
      }
      return null;
    }
    hook(event, listener) {
      const allowedValues = ["preSubcommand", "preAction", "postAction"];
      if (!allowedValues.includes(event)) {
        throw new Error(`Unexpected value for event passed to hook : '${event}'.
Expecting one of '${allowedValues.join("', '")}'`);
      }
      if (this._lifeCycleHooks[event]) {
        this._lifeCycleHooks[event].push(listener);
      } else {
        this._lifeCycleHooks[event] = [listener];
      }
      return this;
    }
    exitOverride(fn) {
      if (fn) {
        this._exitCallback = fn;
      } else {
        this._exitCallback = (err) => {
          if (err.code !== "commander.executeSubCommandAsync") {
            throw err;
          } else {}
        };
      }
      return this;
    }
    _exit(exitCode, code, message) {
      if (this._exitCallback) {
        this._exitCallback(new CommanderError(exitCode, code, message));
      }
      process2.exit(exitCode);
    }
    action(fn) {
      const listener = (args) => {
        const expectedArgsCount = this.registeredArguments.length;
        const actionArgs = args.slice(0, expectedArgsCount);
        if (this._storeOptionsAsProperties) {
          actionArgs[expectedArgsCount] = this;
        } else {
          actionArgs[expectedArgsCount] = this.opts();
        }
        actionArgs.push(this);
        return fn.apply(this, actionArgs);
      };
      this._actionHandler = listener;
      return this;
    }
    createOption(flags, description) {
      return new Option(flags, description);
    }
    _callParseArg(target, value, previous, invalidArgumentMessage) {
      try {
        return target.parseArg(value, previous);
      } catch (err) {
        if (err.code === "commander.invalidArgument") {
          const message = `${invalidArgumentMessage} ${err.message}`;
          this.error(message, { exitCode: err.exitCode, code: err.code });
        }
        throw err;
      }
    }
    _registerOption(option) {
      const matchingOption = option.short && this._findOption(option.short) || option.long && this._findOption(option.long);
      if (matchingOption) {
        const matchingFlag = option.long && this._findOption(option.long) ? option.long : option.short;
        throw new Error(`Cannot add option '${option.flags}'${this._name && ` to command '${this._name}'`} due to conflicting flag '${matchingFlag}'
-  already used by option '${matchingOption.flags}'`);
      }
      this.options.push(option);
    }
    _registerCommand(command) {
      const knownBy = (cmd) => {
        return [cmd.name()].concat(cmd.aliases());
      };
      const alreadyUsed = knownBy(command).find((name) => this._findCommand(name));
      if (alreadyUsed) {
        const existingCmd = knownBy(this._findCommand(alreadyUsed)).join("|");
        const newCmd = knownBy(command).join("|");
        throw new Error(`cannot add command '${newCmd}' as already have command '${existingCmd}'`);
      }
      this.commands.push(command);
    }
    addOption(option) {
      this._registerOption(option);
      const oname = option.name();
      const name = option.attributeName();
      if (option.negate) {
        const positiveLongFlag = option.long.replace(/^--no-/, "--");
        if (!this._findOption(positiveLongFlag)) {
          this.setOptionValueWithSource(name, option.defaultValue === undefined ? true : option.defaultValue, "default");
        }
      } else if (option.defaultValue !== undefined) {
        this.setOptionValueWithSource(name, option.defaultValue, "default");
      }
      const handleOptionValue = (val, invalidValueMessage, valueSource) => {
        if (val == null && option.presetArg !== undefined) {
          val = option.presetArg;
        }
        const oldValue = this.getOptionValue(name);
        if (val !== null && option.parseArg) {
          val = this._callParseArg(option, val, oldValue, invalidValueMessage);
        } else if (val !== null && option.variadic) {
          val = option._concatValue(val, oldValue);
        }
        if (val == null) {
          if (option.negate) {
            val = false;
          } else if (option.isBoolean() || option.optional) {
            val = true;
          } else {
            val = "";
          }
        }
        this.setOptionValueWithSource(name, val, valueSource);
      };
      this.on("option:" + oname, (val) => {
        const invalidValueMessage = `error: option '${option.flags}' argument '${val}' is invalid.`;
        handleOptionValue(val, invalidValueMessage, "cli");
      });
      if (option.envVar) {
        this.on("optionEnv:" + oname, (val) => {
          const invalidValueMessage = `error: option '${option.flags}' value '${val}' from env '${option.envVar}' is invalid.`;
          handleOptionValue(val, invalidValueMessage, "env");
        });
      }
      return this;
    }
    _optionEx(config, flags, description, fn, defaultValue) {
      if (typeof flags === "object" && flags instanceof Option) {
        throw new Error("To add an Option object use addOption() instead of option() or requiredOption()");
      }
      const option = this.createOption(flags, description);
      option.makeOptionMandatory(!!config.mandatory);
      if (typeof fn === "function") {
        option.default(defaultValue).argParser(fn);
      } else if (fn instanceof RegExp) {
        const regex = fn;
        fn = (val, def) => {
          const m = regex.exec(val);
          return m ? m[0] : def;
        };
        option.default(defaultValue).argParser(fn);
      } else {
        option.default(fn);
      }
      return this.addOption(option);
    }
    option(flags, description, parseArg, defaultValue) {
      return this._optionEx({}, flags, description, parseArg, defaultValue);
    }
    requiredOption(flags, description, parseArg, defaultValue) {
      return this._optionEx({ mandatory: true }, flags, description, parseArg, defaultValue);
    }
    combineFlagAndOptionalValue(combine = true) {
      this._combineFlagAndOptionalValue = !!combine;
      return this;
    }
    allowUnknownOption(allowUnknown = true) {
      this._allowUnknownOption = !!allowUnknown;
      return this;
    }
    allowExcessArguments(allowExcess = true) {
      this._allowExcessArguments = !!allowExcess;
      return this;
    }
    enablePositionalOptions(positional = true) {
      this._enablePositionalOptions = !!positional;
      return this;
    }
    passThroughOptions(passThrough = true) {
      this._passThroughOptions = !!passThrough;
      this._checkForBrokenPassThrough();
      return this;
    }
    _checkForBrokenPassThrough() {
      if (this.parent && this._passThroughOptions && !this.parent._enablePositionalOptions) {
        throw new Error(`passThroughOptions cannot be used for '${this._name}' without turning on enablePositionalOptions for parent command(s)`);
      }
    }
    storeOptionsAsProperties(storeAsProperties = true) {
      if (this.options.length) {
        throw new Error("call .storeOptionsAsProperties() before adding options");
      }
      if (Object.keys(this._optionValues).length) {
        throw new Error("call .storeOptionsAsProperties() before setting option values");
      }
      this._storeOptionsAsProperties = !!storeAsProperties;
      return this;
    }
    getOptionValue(key) {
      if (this._storeOptionsAsProperties) {
        return this[key];
      }
      return this._optionValues[key];
    }
    setOptionValue(key, value) {
      return this.setOptionValueWithSource(key, value, undefined);
    }
    setOptionValueWithSource(key, value, source) {
      if (this._storeOptionsAsProperties) {
        this[key] = value;
      } else {
        this._optionValues[key] = value;
      }
      this._optionValueSources[key] = source;
      return this;
    }
    getOptionValueSource(key) {
      return this._optionValueSources[key];
    }
    getOptionValueSourceWithGlobals(key) {
      let source;
      this._getCommandAndAncestors().forEach((cmd) => {
        if (cmd.getOptionValueSource(key) !== undefined) {
          source = cmd.getOptionValueSource(key);
        }
      });
      return source;
    }
    _prepareUserArgs(argv, parseOptions) {
      if (argv !== undefined && !Array.isArray(argv)) {
        throw new Error("first parameter to parse must be array or undefined");
      }
      parseOptions = parseOptions || {};
      if (argv === undefined && parseOptions.from === undefined) {
        if (process2.versions?.electron) {
          parseOptions.from = "electron";
        }
        const execArgv = process2.execArgv ?? [];
        if (execArgv.includes("-e") || execArgv.includes("--eval") || execArgv.includes("-p") || execArgv.includes("--print")) {
          parseOptions.from = "eval";
        }
      }
      if (argv === undefined) {
        argv = process2.argv;
      }
      this.rawArgs = argv.slice();
      let userArgs;
      switch (parseOptions.from) {
        case undefined:
        case "node":
          this._scriptPath = argv[1];
          userArgs = argv.slice(2);
          break;
        case "electron":
          if (process2.defaultApp) {
            this._scriptPath = argv[1];
            userArgs = argv.slice(2);
          } else {
            userArgs = argv.slice(1);
          }
          break;
        case "user":
          userArgs = argv.slice(0);
          break;
        case "eval":
          userArgs = argv.slice(1);
          break;
        default:
          throw new Error(`unexpected parse option { from: '${parseOptions.from}' }`);
      }
      if (!this._name && this._scriptPath)
        this.nameFromFilename(this._scriptPath);
      this._name = this._name || "program";
      return userArgs;
    }
    parse(argv, parseOptions) {
      this._prepareForParse();
      const userArgs = this._prepareUserArgs(argv, parseOptions);
      this._parseCommand([], userArgs);
      return this;
    }
    async parseAsync(argv, parseOptions) {
      this._prepareForParse();
      const userArgs = this._prepareUserArgs(argv, parseOptions);
      await this._parseCommand([], userArgs);
      return this;
    }
    _prepareForParse() {
      if (this._savedState === null) {
        this.saveStateBeforeParse();
      } else {
        this.restoreStateBeforeParse();
      }
    }
    saveStateBeforeParse() {
      this._savedState = {
        _name: this._name,
        _optionValues: { ...this._optionValues },
        _optionValueSources: { ...this._optionValueSources }
      };
    }
    restoreStateBeforeParse() {
      if (this._storeOptionsAsProperties)
        throw new Error(`Can not call parse again when storeOptionsAsProperties is true.
- either make a new Command for each call to parse, or stop storing options as properties`);
      this._name = this._savedState._name;
      this._scriptPath = null;
      this.rawArgs = [];
      this._optionValues = { ...this._savedState._optionValues };
      this._optionValueSources = { ...this._savedState._optionValueSources };
      this.args = [];
      this.processedArgs = [];
    }
    _checkForMissingExecutable(executableFile, executableDir, subcommandName) {
      if (fs.existsSync(executableFile))
        return;
      const executableDirMessage = executableDir ? `searched for local subcommand relative to directory '${executableDir}'` : "no directory for search for local subcommand, use .executableDir() to supply a custom directory";
      const executableMissing = `'${executableFile}' does not exist
 - if '${subcommandName}' is not meant to be an executable command, remove description parameter from '.command()' and use '.description()' instead
 - if the default executable name is not suitable, use the executableFile option to supply a custom name or path
 - ${executableDirMessage}`;
      throw new Error(executableMissing);
    }
    _executeSubCommand(subcommand, args) {
      args = args.slice();
      let launchWithNode = false;
      const sourceExt = [".js", ".ts", ".tsx", ".mjs", ".cjs"];
      function findFile(baseDir, baseName) {
        const localBin = path.resolve(baseDir, baseName);
        if (fs.existsSync(localBin))
          return localBin;
        if (sourceExt.includes(path.extname(baseName)))
          return;
        const foundExt = sourceExt.find((ext) => fs.existsSync(`${localBin}${ext}`));
        if (foundExt)
          return `${localBin}${foundExt}`;
        return;
      }
      this._checkForMissingMandatoryOptions();
      this._checkForConflictingOptions();
      let executableFile = subcommand._executableFile || `${this._name}-${subcommand._name}`;
      let executableDir = this._executableDir || "";
      if (this._scriptPath) {
        let resolvedScriptPath;
        try {
          resolvedScriptPath = fs.realpathSync(this._scriptPath);
        } catch {
          resolvedScriptPath = this._scriptPath;
        }
        executableDir = path.resolve(path.dirname(resolvedScriptPath), executableDir);
      }
      if (executableDir) {
        let localFile = findFile(executableDir, executableFile);
        if (!localFile && !subcommand._executableFile && this._scriptPath) {
          const legacyName = path.basename(this._scriptPath, path.extname(this._scriptPath));
          if (legacyName !== this._name) {
            localFile = findFile(executableDir, `${legacyName}-${subcommand._name}`);
          }
        }
        executableFile = localFile || executableFile;
      }
      launchWithNode = sourceExt.includes(path.extname(executableFile));
      let proc;
      if (process2.platform !== "win32") {
        if (launchWithNode) {
          args.unshift(executableFile);
          args = incrementNodeInspectorPort(process2.execArgv).concat(args);
          proc = childProcess.spawn(process2.argv[0], args, { stdio: "inherit" });
        } else {
          proc = childProcess.spawn(executableFile, args, { stdio: "inherit" });
        }
      } else {
        this._checkForMissingExecutable(executableFile, executableDir, subcommand._name);
        args.unshift(executableFile);
        args = incrementNodeInspectorPort(process2.execArgv).concat(args);
        proc = childProcess.spawn(process2.execPath, args, { stdio: "inherit" });
      }
      if (!proc.killed) {
        const signals = ["SIGUSR1", "SIGUSR2", "SIGTERM", "SIGINT", "SIGHUP"];
        signals.forEach((signal) => {
          process2.on(signal, () => {
            if (proc.killed === false && proc.exitCode === null) {
              proc.kill(signal);
            }
          });
        });
      }
      const exitCallback = this._exitCallback;
      proc.on("close", (code) => {
        code = code ?? 1;
        if (!exitCallback) {
          process2.exit(code);
        } else {
          exitCallback(new CommanderError(code, "commander.executeSubCommandAsync", "(close)"));
        }
      });
      proc.on("error", (err) => {
        if (err.code === "ENOENT") {
          this._checkForMissingExecutable(executableFile, executableDir, subcommand._name);
        } else if (err.code === "EACCES") {
          throw new Error(`'${executableFile}' not executable`);
        }
        if (!exitCallback) {
          process2.exit(1);
        } else {
          const wrappedError = new CommanderError(1, "commander.executeSubCommandAsync", "(error)");
          wrappedError.nestedError = err;
          exitCallback(wrappedError);
        }
      });
      this.runningCommand = proc;
    }
    _dispatchSubcommand(commandName, operands, unknown) {
      const subCommand = this._findCommand(commandName);
      if (!subCommand)
        this.help({ error: true });
      subCommand._prepareForParse();
      let promiseChain;
      promiseChain = this._chainOrCallSubCommandHook(promiseChain, subCommand, "preSubcommand");
      promiseChain = this._chainOrCall(promiseChain, () => {
        if (subCommand._executableHandler) {
          this._executeSubCommand(subCommand, operands.concat(unknown));
        } else {
          return subCommand._parseCommand(operands, unknown);
        }
      });
      return promiseChain;
    }
    _dispatchHelpCommand(subcommandName) {
      if (!subcommandName) {
        this.help();
      }
      const subCommand = this._findCommand(subcommandName);
      if (subCommand && !subCommand._executableHandler) {
        subCommand.help();
      }
      return this._dispatchSubcommand(subcommandName, [], [this._getHelpOption()?.long ?? this._getHelpOption()?.short ?? "--help"]);
    }
    _checkNumberOfArguments() {
      this.registeredArguments.forEach((arg, i) => {
        if (arg.required && this.args[i] == null) {
          this.missingArgument(arg.name());
        }
      });
      if (this.registeredArguments.length > 0 && this.registeredArguments[this.registeredArguments.length - 1].variadic) {
        return;
      }
      if (this.args.length > this.registeredArguments.length) {
        this._excessArguments(this.args);
      }
    }
    _processArguments() {
      const myParseArg = (argument, value, previous) => {
        let parsedValue = value;
        if (value !== null && argument.parseArg) {
          const invalidValueMessage = `error: command-argument value '${value}' is invalid for argument '${argument.name()}'.`;
          parsedValue = this._callParseArg(argument, value, previous, invalidValueMessage);
        }
        return parsedValue;
      };
      this._checkNumberOfArguments();
      const processedArgs = [];
      this.registeredArguments.forEach((declaredArg, index) => {
        let value = declaredArg.defaultValue;
        if (declaredArg.variadic) {
          if (index < this.args.length) {
            value = this.args.slice(index);
            if (declaredArg.parseArg) {
              value = value.reduce((processed, v) => {
                return myParseArg(declaredArg, v, processed);
              }, declaredArg.defaultValue);
            }
          } else if (value === undefined) {
            value = [];
          }
        } else if (index < this.args.length) {
          value = this.args[index];
          if (declaredArg.parseArg) {
            value = myParseArg(declaredArg, value, declaredArg.defaultValue);
          }
        }
        processedArgs[index] = value;
      });
      this.processedArgs = processedArgs;
    }
    _chainOrCall(promise, fn) {
      if (promise && promise.then && typeof promise.then === "function") {
        return promise.then(() => fn());
      }
      return fn();
    }
    _chainOrCallHooks(promise, event) {
      let result = promise;
      const hooks = [];
      this._getCommandAndAncestors().reverse().filter((cmd) => cmd._lifeCycleHooks[event] !== undefined).forEach((hookedCommand) => {
        hookedCommand._lifeCycleHooks[event].forEach((callback) => {
          hooks.push({ hookedCommand, callback });
        });
      });
      if (event === "postAction") {
        hooks.reverse();
      }
      hooks.forEach((hookDetail) => {
        result = this._chainOrCall(result, () => {
          return hookDetail.callback(hookDetail.hookedCommand, this);
        });
      });
      return result;
    }
    _chainOrCallSubCommandHook(promise, subCommand, event) {
      let result = promise;
      if (this._lifeCycleHooks[event] !== undefined) {
        this._lifeCycleHooks[event].forEach((hook) => {
          result = this._chainOrCall(result, () => {
            return hook(this, subCommand);
          });
        });
      }
      return result;
    }
    _parseCommand(operands, unknown) {
      const parsed = this.parseOptions(unknown);
      this._parseOptionsEnv();
      this._parseOptionsImplied();
      operands = operands.concat(parsed.operands);
      unknown = parsed.unknown;
      this.args = operands.concat(unknown);
      if (operands && this._findCommand(operands[0])) {
        return this._dispatchSubcommand(operands[0], operands.slice(1), unknown);
      }
      if (this._getHelpCommand() && operands[0] === this._getHelpCommand().name()) {
        return this._dispatchHelpCommand(operands[1]);
      }
      if (this._defaultCommandName) {
        this._outputHelpIfRequested(unknown);
        return this._dispatchSubcommand(this._defaultCommandName, operands, unknown);
      }
      if (this.commands.length && this.args.length === 0 && !this._actionHandler && !this._defaultCommandName) {
        this.help({ error: true });
      }
      this._outputHelpIfRequested(parsed.unknown);
      this._checkForMissingMandatoryOptions();
      this._checkForConflictingOptions();
      const checkForUnknownOptions = () => {
        if (parsed.unknown.length > 0) {
          this.unknownOption(parsed.unknown[0]);
        }
      };
      const commandEvent = `command:${this.name()}`;
      if (this._actionHandler) {
        checkForUnknownOptions();
        this._processArguments();
        let promiseChain;
        promiseChain = this._chainOrCallHooks(promiseChain, "preAction");
        promiseChain = this._chainOrCall(promiseChain, () => this._actionHandler(this.processedArgs));
        if (this.parent) {
          promiseChain = this._chainOrCall(promiseChain, () => {
            this.parent.emit(commandEvent, operands, unknown);
          });
        }
        promiseChain = this._chainOrCallHooks(promiseChain, "postAction");
        return promiseChain;
      }
      if (this.parent && this.parent.listenerCount(commandEvent)) {
        checkForUnknownOptions();
        this._processArguments();
        this.parent.emit(commandEvent, operands, unknown);
      } else if (operands.length) {
        if (this._findCommand("*")) {
          return this._dispatchSubcommand("*", operands, unknown);
        }
        if (this.listenerCount("command:*")) {
          this.emit("command:*", operands, unknown);
        } else if (this.commands.length) {
          this.unknownCommand();
        } else {
          checkForUnknownOptions();
          this._processArguments();
        }
      } else if (this.commands.length) {
        checkForUnknownOptions();
        this.help({ error: true });
      } else {
        checkForUnknownOptions();
        this._processArguments();
      }
    }
    _findCommand(name) {
      if (!name)
        return;
      return this.commands.find((cmd) => cmd._name === name || cmd._aliases.includes(name));
    }
    _findOption(arg) {
      return this.options.find((option) => option.is(arg));
    }
    _checkForMissingMandatoryOptions() {
      this._getCommandAndAncestors().forEach((cmd) => {
        cmd.options.forEach((anOption) => {
          if (anOption.mandatory && cmd.getOptionValue(anOption.attributeName()) === undefined) {
            cmd.missingMandatoryOptionValue(anOption);
          }
        });
      });
    }
    _checkForConflictingLocalOptions() {
      const definedNonDefaultOptions = this.options.filter((option) => {
        const optionKey = option.attributeName();
        if (this.getOptionValue(optionKey) === undefined) {
          return false;
        }
        return this.getOptionValueSource(optionKey) !== "default";
      });
      const optionsWithConflicting = definedNonDefaultOptions.filter((option) => option.conflictsWith.length > 0);
      optionsWithConflicting.forEach((option) => {
        const conflictingAndDefined = definedNonDefaultOptions.find((defined) => option.conflictsWith.includes(defined.attributeName()));
        if (conflictingAndDefined) {
          this._conflictingOption(option, conflictingAndDefined);
        }
      });
    }
    _checkForConflictingOptions() {
      this._getCommandAndAncestors().forEach((cmd) => {
        cmd._checkForConflictingLocalOptions();
      });
    }
    parseOptions(argv) {
      const operands = [];
      const unknown = [];
      let dest = operands;
      const args = argv.slice();
      function maybeOption(arg) {
        return arg.length > 1 && arg[0] === "-";
      }
      let activeVariadicOption = null;
      while (args.length) {
        const arg = args.shift();
        if (arg === "--") {
          if (dest === unknown)
            dest.push(arg);
          dest.push(...args);
          break;
        }
        if (activeVariadicOption && !maybeOption(arg)) {
          this.emit(`option:${activeVariadicOption.name()}`, arg);
          continue;
        }
        activeVariadicOption = null;
        if (maybeOption(arg)) {
          const option = this._findOption(arg);
          if (option) {
            if (option.required) {
              const value = args.shift();
              if (value === undefined)
                this.optionMissingArgument(option);
              this.emit(`option:${option.name()}`, value);
            } else if (option.optional) {
              let value = null;
              if (args.length > 0 && !maybeOption(args[0])) {
                value = args.shift();
              }
              this.emit(`option:${option.name()}`, value);
            } else {
              this.emit(`option:${option.name()}`);
            }
            activeVariadicOption = option.variadic ? option : null;
            continue;
          }
        }
        if (arg.length > 2 && arg[0] === "-" && arg[1] !== "-") {
          const option = this._findOption(`-${arg[1]}`);
          if (option) {
            if (option.required || option.optional && this._combineFlagAndOptionalValue) {
              this.emit(`option:${option.name()}`, arg.slice(2));
            } else {
              this.emit(`option:${option.name()}`);
              args.unshift(`-${arg.slice(2)}`);
            }
            continue;
          }
        }
        if (/^--[^=]+=/.test(arg)) {
          const index = arg.indexOf("=");
          const option = this._findOption(arg.slice(0, index));
          if (option && (option.required || option.optional)) {
            this.emit(`option:${option.name()}`, arg.slice(index + 1));
            continue;
          }
        }
        if (maybeOption(arg)) {
          dest = unknown;
        }
        if ((this._enablePositionalOptions || this._passThroughOptions) && operands.length === 0 && unknown.length === 0) {
          if (this._findCommand(arg)) {
            operands.push(arg);
            if (args.length > 0)
              unknown.push(...args);
            break;
          } else if (this._getHelpCommand() && arg === this._getHelpCommand().name()) {
            operands.push(arg);
            if (args.length > 0)
              operands.push(...args);
            break;
          } else if (this._defaultCommandName) {
            unknown.push(arg);
            if (args.length > 0)
              unknown.push(...args);
            break;
          }
        }
        if (this._passThroughOptions) {
          dest.push(arg);
          if (args.length > 0)
            dest.push(...args);
          break;
        }
        dest.push(arg);
      }
      return { operands, unknown };
    }
    opts() {
      if (this._storeOptionsAsProperties) {
        const result = {};
        const len = this.options.length;
        for (let i = 0;i < len; i++) {
          const key = this.options[i].attributeName();
          result[key] = key === this._versionOptionName ? this._version : this[key];
        }
        return result;
      }
      return this._optionValues;
    }
    optsWithGlobals() {
      return this._getCommandAndAncestors().reduce((combinedOptions, cmd) => Object.assign(combinedOptions, cmd.opts()), {});
    }
    error(message, errorOptions) {
      this._outputConfiguration.outputError(`${message}
`, this._outputConfiguration.writeErr);
      if (typeof this._showHelpAfterError === "string") {
        this._outputConfiguration.writeErr(`${this._showHelpAfterError}
`);
      } else if (this._showHelpAfterError) {
        this._outputConfiguration.writeErr(`
`);
        this.outputHelp({ error: true });
      }
      const config = errorOptions || {};
      const exitCode = config.exitCode || 1;
      const code = config.code || "commander.error";
      this._exit(exitCode, code, message);
    }
    _parseOptionsEnv() {
      this.options.forEach((option) => {
        if (option.envVar && option.envVar in process2.env) {
          const optionKey = option.attributeName();
          if (this.getOptionValue(optionKey) === undefined || ["default", "config", "env"].includes(this.getOptionValueSource(optionKey))) {
            if (option.required || option.optional) {
              this.emit(`optionEnv:${option.name()}`, process2.env[option.envVar]);
            } else {
              this.emit(`optionEnv:${option.name()}`);
            }
          }
        }
      });
    }
    _parseOptionsImplied() {
      const dualHelper = new DualOptions(this.options);
      const hasCustomOptionValue = (optionKey) => {
        return this.getOptionValue(optionKey) !== undefined && !["default", "implied"].includes(this.getOptionValueSource(optionKey));
      };
      this.options.filter((option) => option.implied !== undefined && hasCustomOptionValue(option.attributeName()) && dualHelper.valueFromOption(this.getOptionValue(option.attributeName()), option)).forEach((option) => {
        Object.keys(option.implied).filter((impliedKey) => !hasCustomOptionValue(impliedKey)).forEach((impliedKey) => {
          this.setOptionValueWithSource(impliedKey, option.implied[impliedKey], "implied");
        });
      });
    }
    missingArgument(name) {
      const message = `error: missing required argument '${name}'`;
      this.error(message, { code: "commander.missingArgument" });
    }
    optionMissingArgument(option) {
      const message = `error: option '${option.flags}' argument missing`;
      this.error(message, { code: "commander.optionMissingArgument" });
    }
    missingMandatoryOptionValue(option) {
      const message = `error: required option '${option.flags}' not specified`;
      this.error(message, { code: "commander.missingMandatoryOptionValue" });
    }
    _conflictingOption(option, conflictingOption) {
      const findBestOptionFromValue = (option2) => {
        const optionKey = option2.attributeName();
        const optionValue = this.getOptionValue(optionKey);
        const negativeOption = this.options.find((target) => target.negate && optionKey === target.attributeName());
        const positiveOption = this.options.find((target) => !target.negate && optionKey === target.attributeName());
        if (negativeOption && (negativeOption.presetArg === undefined && optionValue === false || negativeOption.presetArg !== undefined && optionValue === negativeOption.presetArg)) {
          return negativeOption;
        }
        return positiveOption || option2;
      };
      const getErrorMessage = (option2) => {
        const bestOption = findBestOptionFromValue(option2);
        const optionKey = bestOption.attributeName();
        const source = this.getOptionValueSource(optionKey);
        if (source === "env") {
          return `environment variable '${bestOption.envVar}'`;
        }
        return `option '${bestOption.flags}'`;
      };
      const message = `error: ${getErrorMessage(option)} cannot be used with ${getErrorMessage(conflictingOption)}`;
      this.error(message, { code: "commander.conflictingOption" });
    }
    unknownOption(flag) {
      if (this._allowUnknownOption)
        return;
      let suggestion = "";
      if (flag.startsWith("--") && this._showSuggestionAfterError) {
        let candidateFlags = [];
        let command = this;
        do {
          const moreFlags = command.createHelp().visibleOptions(command).filter((option) => option.long).map((option) => option.long);
          candidateFlags = candidateFlags.concat(moreFlags);
          command = command.parent;
        } while (command && !command._enablePositionalOptions);
        suggestion = suggestSimilar(flag, candidateFlags);
      }
      const message = `error: unknown option '${flag}'${suggestion}`;
      this.error(message, { code: "commander.unknownOption" });
    }
    _excessArguments(receivedArgs) {
      if (this._allowExcessArguments)
        return;
      const expected = this.registeredArguments.length;
      const s = expected === 1 ? "" : "s";
      const forSubcommand = this.parent ? ` for '${this.name()}'` : "";
      const message = `error: too many arguments${forSubcommand}. Expected ${expected} argument${s} but got ${receivedArgs.length}.`;
      this.error(message, { code: "commander.excessArguments" });
    }
    unknownCommand() {
      const unknownName = this.args[0];
      let suggestion = "";
      if (this._showSuggestionAfterError) {
        const candidateNames = [];
        this.createHelp().visibleCommands(this).forEach((command) => {
          candidateNames.push(command.name());
          if (command.alias())
            candidateNames.push(command.alias());
        });
        suggestion = suggestSimilar(unknownName, candidateNames);
      }
      const message = `error: unknown command '${unknownName}'${suggestion}`;
      this.error(message, { code: "commander.unknownCommand" });
    }
    version(str, flags, description) {
      if (str === undefined)
        return this._version;
      this._version = str;
      flags = flags || "-V, --version";
      description = description || "output the version number";
      const versionOption = this.createOption(flags, description);
      this._versionOptionName = versionOption.attributeName();
      this._registerOption(versionOption);
      this.on("option:" + versionOption.name(), () => {
        this._outputConfiguration.writeOut(`${str}
`);
        this._exit(0, "commander.version", str);
      });
      return this;
    }
    description(str, argsDescription) {
      if (str === undefined && argsDescription === undefined)
        return this._description;
      this._description = str;
      if (argsDescription) {
        this._argsDescription = argsDescription;
      }
      return this;
    }
    summary(str) {
      if (str === undefined)
        return this._summary;
      this._summary = str;
      return this;
    }
    alias(alias) {
      if (alias === undefined)
        return this._aliases[0];
      let command = this;
      if (this.commands.length !== 0 && this.commands[this.commands.length - 1]._executableHandler) {
        command = this.commands[this.commands.length - 1];
      }
      if (alias === command._name)
        throw new Error("Command alias can't be the same as its name");
      const matchingCommand = this.parent?._findCommand(alias);
      if (matchingCommand) {
        const existingCmd = [matchingCommand.name()].concat(matchingCommand.aliases()).join("|");
        throw new Error(`cannot add alias '${alias}' to command '${this.name()}' as already have command '${existingCmd}'`);
      }
      command._aliases.push(alias);
      return this;
    }
    aliases(aliases) {
      if (aliases === undefined)
        return this._aliases;
      aliases.forEach((alias) => this.alias(alias));
      return this;
    }
    usage(str) {
      if (str === undefined) {
        if (this._usage)
          return this._usage;
        const args = this.registeredArguments.map((arg) => {
          return humanReadableArgName(arg);
        });
        return [].concat(this.options.length || this._helpOption !== null ? "[options]" : [], this.commands.length ? "[command]" : [], this.registeredArguments.length ? args : []).join(" ");
      }
      this._usage = str;
      return this;
    }
    name(str) {
      if (str === undefined)
        return this._name;
      this._name = str;
      return this;
    }
    nameFromFilename(filename) {
      this._name = path.basename(filename, path.extname(filename));
      return this;
    }
    executableDir(path2) {
      if (path2 === undefined)
        return this._executableDir;
      this._executableDir = path2;
      return this;
    }
    helpInformation(contextOptions) {
      const helper = this.createHelp();
      const context = this._getOutputContext(contextOptions);
      helper.prepareContext({
        error: context.error,
        helpWidth: context.helpWidth,
        outputHasColors: context.hasColors
      });
      const text = helper.formatHelp(this, helper);
      if (context.hasColors)
        return text;
      return this._outputConfiguration.stripColor(text);
    }
    _getOutputContext(contextOptions) {
      contextOptions = contextOptions || {};
      const error = !!contextOptions.error;
      let baseWrite;
      let hasColors;
      let helpWidth;
      if (error) {
        baseWrite = (str) => this._outputConfiguration.writeErr(str);
        hasColors = this._outputConfiguration.getErrHasColors();
        helpWidth = this._outputConfiguration.getErrHelpWidth();
      } else {
        baseWrite = (str) => this._outputConfiguration.writeOut(str);
        hasColors = this._outputConfiguration.getOutHasColors();
        helpWidth = this._outputConfiguration.getOutHelpWidth();
      }
      const write = (str) => {
        if (!hasColors)
          str = this._outputConfiguration.stripColor(str);
        return baseWrite(str);
      };
      return { error, write, hasColors, helpWidth };
    }
    outputHelp(contextOptions) {
      let deprecatedCallback;
      if (typeof contextOptions === "function") {
        deprecatedCallback = contextOptions;
        contextOptions = undefined;
      }
      const outputContext = this._getOutputContext(contextOptions);
      const eventContext = {
        error: outputContext.error,
        write: outputContext.write,
        command: this
      };
      this._getCommandAndAncestors().reverse().forEach((command) => command.emit("beforeAllHelp", eventContext));
      this.emit("beforeHelp", eventContext);
      let helpInformation = this.helpInformation({ error: outputContext.error });
      if (deprecatedCallback) {
        helpInformation = deprecatedCallback(helpInformation);
        if (typeof helpInformation !== "string" && !Buffer.isBuffer(helpInformation)) {
          throw new Error("outputHelp callback must return a string or a Buffer");
        }
      }
      outputContext.write(helpInformation);
      if (this._getHelpOption()?.long) {
        this.emit(this._getHelpOption().long);
      }
      this.emit("afterHelp", eventContext);
      this._getCommandAndAncestors().forEach((command) => command.emit("afterAllHelp", eventContext));
    }
    helpOption(flags, description) {
      if (typeof flags === "boolean") {
        if (flags) {
          this._helpOption = this._helpOption ?? undefined;
        } else {
          this._helpOption = null;
        }
        return this;
      }
      flags = flags ?? "-h, --help";
      description = description ?? "display help for command";
      this._helpOption = this.createOption(flags, description);
      return this;
    }
    _getHelpOption() {
      if (this._helpOption === undefined) {
        this.helpOption(undefined, undefined);
      }
      return this._helpOption;
    }
    addHelpOption(option) {
      this._helpOption = option;
      return this;
    }
    help(contextOptions) {
      this.outputHelp(contextOptions);
      let exitCode = Number(process2.exitCode ?? 0);
      if (exitCode === 0 && contextOptions && typeof contextOptions !== "function" && contextOptions.error) {
        exitCode = 1;
      }
      this._exit(exitCode, "commander.help", "(outputHelp)");
    }
    addHelpText(position, text) {
      const allowedValues = ["beforeAll", "before", "after", "afterAll"];
      if (!allowedValues.includes(position)) {
        throw new Error(`Unexpected value for position to addHelpText.
Expecting one of '${allowedValues.join("', '")}'`);
      }
      const helpEvent = `${position}Help`;
      this.on(helpEvent, (context) => {
        let helpStr;
        if (typeof text === "function") {
          helpStr = text({ error: context.error, command: context.command });
        } else {
          helpStr = text;
        }
        if (helpStr) {
          context.write(`${helpStr}
`);
        }
      });
      return this;
    }
    _outputHelpIfRequested(args) {
      const helpOption = this._getHelpOption();
      const helpRequested = helpOption && args.find((arg) => helpOption.is(arg));
      if (helpRequested) {
        this.outputHelp();
        this._exit(0, "commander.helpDisplayed", "(outputHelp)");
      }
    }
  }
  function incrementNodeInspectorPort(args) {
    return args.map((arg) => {
      if (!arg.startsWith("--inspect")) {
        return arg;
      }
      let debugOption;
      let debugHost = "127.0.0.1";
      let debugPort = "9229";
      let match;
      if ((match = arg.match(/^(--inspect(-brk)?)$/)) !== null) {
        debugOption = match[1];
      } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+)$/)) !== null) {
        debugOption = match[1];
        if (/^\d+$/.test(match[3])) {
          debugPort = match[3];
        } else {
          debugHost = match[3];
        }
      } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+):(\d+)$/)) !== null) {
        debugOption = match[1];
        debugHost = match[3];
        debugPort = match[4];
      }
      if (debugOption && debugPort !== "0") {
        return `${debugOption}=${debugHost}:${parseInt(debugPort) + 1}`;
      }
      return arg;
    });
  }
  function useColor() {
    if (process2.env.NO_COLOR || process2.env.FORCE_COLOR === "0" || process2.env.FORCE_COLOR === "false")
      return false;
    if (process2.env.FORCE_COLOR || process2.env.CLICOLOR_FORCE !== undefined)
      return true;
    return;
  }
  exports.Command = Command;
  exports.useColor = useColor;
});

// ../../node_modules/commander/index.js
var require_commander = __commonJS((exports) => {
  var { Argument } = require_argument();
  var { Command } = require_command();
  var { CommanderError, InvalidArgumentError } = require_error();
  var { Help } = require_help();
  var { Option } = require_option();
  exports.program = new Command;
  exports.createCommand = (name) => new Command(name);
  exports.createOption = (flags, description) => new Option(flags, description);
  exports.createArgument = (name, description) => new Argument(name, description);
  exports.Command = Command;
  exports.Option = Option;
  exports.Argument = Argument;
  exports.Help = Help;
  exports.CommanderError = CommanderError;
  exports.InvalidArgumentError = InvalidArgumentError;
  exports.InvalidOptionArgumentError = InvalidArgumentError;
});

// src/shipflow-contract-data.ts
var SHIPFLOW_CONTRACT;
var init_shipflow_contract_data = __esm(() => {
  SHIPFLOW_CONTRACT = {
    $comment: "Canonical ShipFlow contract (issue #179), a SIBLING of review-contract.json: the single source of truth for cross-surface ShipFlow constants that are NOT specific to the review packet — the workflow-type / execution-status / channel-type / plan-type taxonomies, the GitHub label palette + lifecycle label names, the hidden issue-lifecycle markers, and the message-readability word cap. These are shared by a BROADER audience than the two reviewers (the server webhook/issue handlers, the CLI issue/PR commands, and the dashboard), so they live beside — not inside — review-contract.json, whose scope stays exactly 'constants both reviewers share' and whose caps/lists/mirrors are left untouched. Mirrors (regenerate with `node scripts/sync-review-contract.mjs`; parity tests on all three sides fail on drift): apps/renaissshipflow-server/internal/shipflowcontract/shipflow-contract.json (go:embed, byte-identical), apps/renaissshipflow-cli/src/shipflow-contract-data.ts (generated), apps/renaissshipflow-dashboard/src/lib/shipflow-contract-data.ts (generated). Only the LITERALS are single-sourced — each consumer keeps its own MATCHING semantics (the server matches the escalation banner with a loose HasPrefix on markers.escalationBannerEmoji; the CLI matches with the stricter startsWith on markers.escalationBannerHeading).",
    version: 1,
    workflowTypes: {
      $comment: "The complete WorkflowType taxonomy. The Go domain.WorkflowType constants (domain/workflow.go — the dispatch source of truth, enumerated as domain.AllWorkflowTypes) are pinned to this list by a parity test, and the dashboard's WorkflowType union derives from it directly (typeof SHIPFLOW_CONTRACT.workflowTypes.values[number]). `uat_tests` is real (it has a Go runner + constant) and was missing from the dashboard union; `dependency_audit` was a phantom TS-only value with NO server constant or runner and has been removed (issue #179).",
      values: [
        "issue_triage",
        "commit_impact",
        "patch_notes",
        "regression_tests",
        "uat_tests",
        "weekly_summary",
        "planning_summary",
        "pr_notification",
        "pr_review",
        "bug_report_triage",
        "test_runner",
        "codebase_qa"
      ]
    },
    executionStatuses: {
      $comment: "The complete domain.ExecutionStatus taxonomy (execution.go — the execution-list statuses the API emits), single-sourced per issue #185 exactly as #179 did for workflowTypes. Go's domain constants (enumerated as domain.AllExecutionStatuses) are pinned to this list by a parity test, the dashboard's ExecutionStatus union derives from it (any value the API can emit that the union misses white-screens StatusBadge), and a spec-accuracy test pins every execution-status enum in openapi.yaml to it (the spec had verified drift: `cancelled` was missing from ExecutionLog.status). NOT to be confused with the CLI's per-run gate statuses (pending/in_progress/success/failure/skipped) — that is a different server enum, renamed GateStatus in the CLI so this domain name stays unambiguous.",
      values: [
        "queued",
        "dispatched",
        "running",
        "completed",
        "failed",
        "cancelled",
        "skipped"
      ]
    },
    channelTypes: {
      $comment: "The complete domain.ChannelType taxonomy (notification.go — notification delivery methods), single-sourced per issue #185. Go's domain.AllChannelTypes is pinned to this list by a parity test, the dashboard and CLI ChannelType unions derive from it, and a spec-accuracy test pins every channelType enum in openapi.yaml to it (the spec had verified drift: `telegram` was live everywhere but missing from NotificationChannel/CreateChannelRequest).",
      values: [
        "discord",
        "slack",
        "email",
        "webhook",
        "telegram",
        "whatsapp"
      ]
    },
    planTypes: {
      $comment: "The complete domain.PlanType taxonomy (tenant.go — subscription tiers), single-sourced per issue #185. Go's domain.AllPlanTypes is pinned to this list by a parity test, the dashboard and CLI PlanType unions derive from it, and a spec-accuracy test requires every plan enum in openapi.yaml to be a subset of it (full-list where the field is a stored plan; deliberate subsets like the upgrade-target [pro, enterprise] stay subsets).",
      values: [
        "free",
        "pro",
        "enterprise"
      ]
    },
    labels: {
      $comment: "ShipFlow's GitHub label palette + the lifecycle label NAMES. `colors` maps a label name to its 6-hex color; ShipFlow owns these colors and BOTH the server's ensureLabels and the CLI's ghEnsureLabel source this ONE map (pre-contract they were byte-identical copies, so a color edit on one side flip-flopped the label). `prefixColors` colors open-ended label groups by name prefix. `names` are the lifecycle labels the code references by MEANING (claim / escalation / approval / reporter-review / verify-failed); every `names` value is also a `colors` key (parity-tested). `needsReporterApproval` is the INTAKE gate (issue #448): an issue opened by an account outside the code org carries it until a trusted maintainer approves, and `isActionableForPickup` refuses to claim a carrier — so the loop cannot build work nobody in the org has green-lit. It is deliberately NOT `needsReporterReview`: that label is the #441 MERGE gate with its own confirmation-token grammar, and one reply must never release two different decisions. `verifyFailed` is applied by the post-deploy verifier when a PR's verification manifest has a failing assertion (issue #207) — it hooks the reporter ping and the follow-up auto-revert. `autoHarvested` marks issues the cross-reviewer finding harvester files from valid findings OTHER PR reviewers (gemini-code-assist, chatgpt-codex-connector) raised and ShipFlow missed (part of #56). Repaint/matching semantics stay per-consumer — only the literals are shared.",
      colors: {
        bug: "d73a4a",
        enhancement: "a2eeef",
        feature: "a2eeef",
        task: "0052cc",
        "priority:low": "0e8a16",
        "priority:medium": "fbca04",
        "priority:high": "ff9f1c",
        "priority:critical": "e11d48",
        "severity:cosmetic": "c5def5",
        "severity:minor": "0e8a16",
        "severity:major": "ff9f1c",
        "severity:blocking": "e11d48",
        "\uD83E\uDD16 in-progress": "1d76db",
        "needs-reporter-review": "d4c5f9",
        "needs-reporter-approval": "c2a5f9",
        "needs-human": "d93f0b",
        "shipflow-approved": "0e8a16",
        "loop-proceed": "0e8a16",
        "auto-qa": "5319e7",
        "verify-failed": "b60205",
        "severity:critical": "b60205",
        "severity:high": "d93f0b",
        "severity:medium": "fbca04",
        "severity:low": "c2e0c6",
        "via-shipflow": "0e7490",
        "auto-harvested": "d876e3",
        "⏳ waiting-on": "fbca04"
      },
      prefixColors: {
        "category:": "5319e7",
        "area:": "c5def5",
        "epic:": "d4c5f9"
      },
      names: {
        inProgress: "\uD83E\uDD16 in-progress",
        needsReporterReview: "needs-reporter-review",
        needsReporterApproval: "needs-reporter-approval",
        needsHuman: "needs-human",
        shipflowApproved: "shipflow-approved",
        verifyFailed: "verify-failed",
        viaShipflow: "via-shipflow",
        autoHarvested: "auto-harvested",
        waitingOn: "⏳ waiting-on"
      }
    },
    markers: {
      $comment: "Hidden issue-lifecycle markers + the escalation-banner literals. `triaged` is stamped on every ShipFlow-created issue so the issues.opened webhook suppresses the redundant AI Issue Triage pass (server domain.IssueAutoTriagedMarker + CLI ghIssueCreate). `loop` marks loop-progress comments — matched by the server's needs-human auto-unblock, written by the loop per the skill contract. `interpretationNote` is the deliberate-reinterpretation flag a worker embeds in a PR body when it ships an off-brief reading of the ask (issue #190): the CLI intent gate (`pr automerge`/`pr ready`, via packet.hasInterpretationSignal) treats its presence as a first-class merge blocker so the human reporter confirms before it reaches production, and the server companion pings the reporter on the resulting needs-reporter-review label. `escalationBannerEmoji` (\uD83D\uDEA7) is what the server matches with a LOOSE HasPrefix (legacy comments depend on it). `escalationBannerHeading` is the stricter prefix the CLI matches with startsWith AND the opening of the CLI's rendered banner; it MUST start with escalationBannerEmoji (parity-tested), so a CLI-posted banner always satisfies the server's loose match. `verificationManifestHeading` is the section heading text a PR author uses to declare post-deploy verification assertions (issue #207); the server matches it tolerantly (case-insensitive, ignoring leading `#` and trailing punctuation) to extract the manifest, then posts its verdict comment stamped with `verificationComment`. `precedentContext` and `precedentApplied` are the decision-precedent-store markers (issue #210, slice 3). `precedentContext` is a HIDDEN OPEN-TOKEN the CLI appends to every `issue escalate <n> --reason` banner carrying the raw ask so the server's webhook capture can fingerprint the exact same text a later `precedents/match` lookup will — rendered as `<!-- shipflow:precedent-context cat=<category> q=<base64(reason)> -->` (the `cat=`/`q=` attributes are the CLI→server convention). `precedentApplied` is the OPEN-TOKEN on the auto-application disclosure comment (`\uD83D\uDD01 Auto-resolved per your #N decision`), rendered as `<!-- shipflow:precedent-applied pid=<id> -->`; the server's undo watcher matches it with a loose Contains and reads `pid=` to know which precedent a one-word `undo`/`no` reply reverses, and `commentIsLoopMachinery` learns it so a disclosure can never itself clear needs-human/needs-reporter-review. Both are OPEN tokens (no trailing `-->` in the literal) matched with Contains, like the escalation-banner emoji is matched with HasPrefix — the render closes the tag after the attributes. MATCHING SEMANTICS (issue #411 changed these deliberately — the note above used to read `Do NOT change these matching semantics`): `commentIsLoopMachinery` no longer denylists three specific markers, it matches `markerPrefix` — ANY `<!-- shipflow:` token — because a denylist of known shapes guarding an unbounded set of free-form agent prose fails OPEN on every new shape the loop invents (measured on PRs #401 and #405, which cleared a merge blocker nobody confirmed). `markerPrefix` is the OPEN token every ShipFlow marker starts with; a comment carrying any of them is machinery and can never stand in for a human decision. `loopReview` stamps the loop reviewer's verdict comment (CLI review-contract.ts renderFindingBody + `approve --comment`) — it was a CLI-local const the server could not see, which is exactly how #405 cleared its own gate. `approvedHead` is the OPEN token the approve command stamps on that same attestation comment, rendered as `<!-- shipflow:approved-head sha=<40hex> -->` (issue #637): `isApproved` / `classifyPR` / `mergeDecision` bind `shipflow-approved` to the reviewed head — a label without a matching SHA, or a missing/unreadable SHA, is not approved (fail closed). Quote-stripped and own-line-anchored. A clean rebase invalidates this slice; digest-equal keep-approval is a later product choice. `intentGateCleared` is the OPEN token on the server's attributable audit comment posted on EVERY `needs-reporter-review` removal, rendered as `<!-- shipflow:intent-gate-cleared by=<login> -->`; the CLI's intent gate reads it as the clearance artifact instead of trusting the bare `unlabeled` timeline event (see the `intentGate` section) — and reads it ANCHORED (own line, `by=<login> -->` shape) and ONLY from a bot/trusted-association author, because a bare Contains over every comment let anyone who can quote the literal disarm the gate permanently. `intentGateHint` stamps the server's one-time nudge posted when a human reply on a gated thread misses the release grammar; its presence is also how the nudge stays one-time (fail-stuck was previously invisible — the miss path only logged). `intentGateParentConfirm` is the OPEN token on the one-time nudge posted on a gated PR when a trusted confirm token landed on its parent issue instead (issue #557), rendered as `<!-- shipflow:intent-gate-parent-confirm id=<comment-id> -->`. It does NOT reuse `intentGateHint` (that marker suppresses the near-miss nudge). Presence of this token on the PR is the once-key per (PR, parent confirm). The comment never removes `needs-reporter-review`; only a token on the PR thread (or a hand label removal) does. `reworkFrom` is the OPEN-TOKEN a rework worker stamps on the comment it posts after acting on a reporter's CORRECTION of an intent-gated PR (issue #442), rendered as `<!-- shipflow:rework-from id=<comment-id> -->` — the `id=` attribute convention mirrors `precedentApplied`'s `pid=`. The CLI's `reporterCorrectionOn` reads the id back so suppression is EXACT (that comment has been answered) rather than timestamp-ordered, and counts the markers to enforce the rework ceiling; the server needs no accessor because `markerPrefix` already makes any comment carrying it machinery. It is the anti-self-loop backstop: without it a loop comment on a gated PR reads as a fresh reporter correction and the loop reworks in response to itself. `escalateOnce` is the OPEN-TOKEN the CLI stamps INSIDE the escalation banner when `issue escalate --for-pr <n> --once-reason <r>` is given, rendered as `<!-- shipflow:escalate-once pr=<n> reason=<r> -->` — the `pr=`/`reason=` attribute convention mirrors `precedentContext`'s `cat=`/`q=`. It is the PERMANENT once-key for `inbox`'s `escalateOnce` row (issue #488): the key USED to be the parent issue's live `needs-human` label, but the server's UnblockNeedsHuman removes that label on any non-bot, non-machinery comment BY DESIGN, so the only once-key was erased the moment a human replied and the row re-escalated every tick forever. A comment marker cannot be erased by a reply, and unlike a label it CARRIES THE REASON — so the invariant it enforces is `at most one escalation per (PR, reason), EVER`: a new reason on the same PR earns exactly one more, and the PR is capped at one escalation per `ESCALATE_ONCE_REASONS` entry, forever. The CLI reads it back from the PARENT issue's comments under THREE filters, ALL required, because each of the first two was measured insufficient on its own: (1) only comments the CLI's own account authored (`viewerDidAuthor`); (2) only ANCHORED — alone on its line, starting at COLUMN 0, no leading whitespace — because a quoted marker is a claim, not evidence; those two are the intent-gate audit record's rule (#411). (3) only from comments that ARE an escalation banner (`isEscalationBanner`, the same `escalationBannerHeading` prefix `findLatestEscalationComment` selects on) — added in PR #489 round 4. Filters 1+2 alone accepted an anchored marker from ANY CLI-authored comment on the parent, and the CLI writes many comments that are not banners: `issue wait --reason <text>` posts one on that very issue with LLM-composed text interpolated raw, on the path loop-mode.md mandates. That reason forged a permanent key and silently spent the one escalation the (PR, reason) pair ever earns — issue #488's exact harm through the adjacent door. Scoping the READ was chosen over neutralizing yet another writer: rounds 2 and 3 each hardened one side of this boundary and left the other open, whereas a key that counts ONLY where the single writer of a key (`formatEscalationBody`) puts one means adding a new CLI comment can never create a new forgery surface. The harvester `extractEscalateOnceMarkers` is scoped by the same predicate one hop earlier, so an unscoped harvest cannot LAUNDER a forged key out of a non-banner comment and into a banner via the `--update` carry-forward. Neutralization below stays defence in depth, not the wall. The anchor tolerated leading indentation until PR #489 round 3; that tolerance bought nothing (the renderer always emits a marker at column 0) and cost a forgery route, since four leading spaces is exactly how markdown spells a code block. Trailing whitespace and CRLF ARE tolerated — opposite polarity: a real key that fails to match reads as never-filed and re-opens the storm, and trailing space cannot smuggle a marker in. NEUTRALIZATION (the other half, PR #489 round 3): every banner is a comment the CLI's OWN account authors, so ANY free-form string folded into one is a forgery vector — an own-line marker in it reads back as a filed key and permanently suppresses an escalation a human is waiting on. So EVERY operator- or server-supplied string reaching a banner has its `<!-- shipflow:` tokens escaped to `&lt;!-- shipflow:` (readable, unmatchable): the free-text `--reason`, `--owner`, and the echoed precedent `answer`/`author`/`sourceUrl`/`category`/`fingerprint`/`id`. Round 2 neutralized the precedent answer ALONE and left `--reason` beside it raw; that asymmetry was itself the defect, so the rule is positional now — nothing free-form reaches a banner un-neutralized. The escaped replacement is DERIVED from `markerPrefix` (only the leading `<` is escaped), never a hand-written twin, so the two halves cannot drift. Whitespace collapsing runs BEFORE escaping (PR #489 round 4): the other order left a token already split across a line break unmatched, then REBUILT it into a live one — inert only because every call site happens to prefix the field, a positional accident rather than a property of the neutralizer. The two `PrecedentMatch` numerics folded into a banner (`sourceIssue`, `reuseCount`) are coerced with `Number()` at the render site: that response is an unchecked cast over server JSON, so `number` is a compile-time claim, not a fact about the bytes. Single-line fields additionally have newlines collapsed, or a value could BREAK OUT of the line the renderer composed for it and land a marker at column 0 anyway (`pid=`/`cat=` are interpolated into a marker line themselves). The RAW reason is still what `precedentContext` encodes — the server fingerprints that text — so the two must not be conflated. WRITE SIDE: `issue escalate --update` REPLACES a banner body in place, and `findLatestEscalationComment` matches ANY CLI-authored comment opening with the banner heading — which the escalate-once banner is — so the CLI carries every anchored marker on the edited body FORWARD (`preserveEscalateOnceMarkers`). Without that, an ordinary UNKEYED re-escalation of the same parent (the path the escalation contract MANDATES: `Shrink, don't stack — one live escalation per issue`) erased the key and handed that (PR, reason) back its per-tick storm forever. Related: a keyed escalation SKIPS the precedent lookup entirely. The reason it must never auto-apply is that the server's undo retires the precedent but cannot un-write a permanent marker, so an undone auto-application would park the row forever with its promised fresh escalation never arriving. PR #489 round 2 achieved that by DEMOTING the `apply` verdict after the call; round 3 moved it before, because `precedents/match` increments the reuse count and writes an `Applied` event BEFORE it returns — so demoting downstream still left the server having booked a reuse that never happened, advancing take-rate metrics and pushing the precedent toward premature re-confirmation. Not asking is the only way not to be counted. Consequence: a keyed escalation shows no `Precedent on file` suggestion; restoring that needs a non-mutating surface-only match on the SERVER. Do NOT key this off `escalationOutstanding`/`findLatestEscalationComment`: those ask whether an escalation is OUTSTANDING (issue #486), the opposite polarity of whether one was EVER FILED, and sharing a helper between the two reintroduces this bug. The server needs no accessor — `markerPrefix` already makes any comment carrying it machinery. Only the literals are single-sourced — each consumer still owns its own matching semantics. `judge`/`judgeEnd` (issue #969) bracket the loop-maintained JUDGE BLOCK at the TOP of an issue body — the four lines a human reads to decide (state · PR/blocker · enumerated replies · impact), rendered as `<!-- shipflow:judge state=<s> since=<iso> -->…<!-- shipflow:judge-end -->` and upserted in place by `issue judge <n>` at every state change so the thread never has to be scrolled to learn where the issue stands. `judge` is an OPEN token (attributes follow); `judgeEnd` is the literal closer. Body-resident, so `commentIsLoopMachinery` never sees it. `intake` stamps the ONE live intake/assumptions comment per issue that `issue brief <n>` edits in place (superseded text folds into a History details block) — the same one-live-comment rule the \uD83D\uDEA7 banner follows via `--update`. `by` (issue #980) is the OPEN-TOKEN provenance stamp every ShipFlow-written comment carries, rendered `<!-- shipflow:by surface=<server|cli|chatbot> -->` and appended, together with the visible `provenanceFooter` (`<sub>\uD83E\uDD16 ShipFlow</sub>`), at the write choke points (server GitHubHelper.AddComment / UpdateIssueComment / ReplyToReviewComment / CreatePRReview, CLI ghIssueComment / ghUpdateIssueComment / ghCreateReview; the chatbot relay stamps its own `surface=chatbot` one hop earlier) ONLY when the body carries no `markerPrefix` token yet — so every present and future writer is machinery by construction, not by audit, and an already-marked body comes out byte-identical. It exists because a token-mode tenant acts as a human member's own account: authorship cannot tell ShipFlow from the operator, so `commentIsLoopMachinery` (which already keys on `markerPrefix`) and the CLI's shape-based reply finders are the only discriminators, and an unmarked writer would read as a human and could clear a gate. `provenanceFooter` is the human-visible half; it lives inside `<sub>` and never on its own line, so the anchored-marker readers (escalate-once, intent-gate-cleared) ignore it. A reply a human types in GitHub's comment box never carries either.",
      triaged: "<!-- shipflow:triaged -->",
      loop: "<!-- shipflow:loop -->",
      loopReview: "<!-- shipflow:loop-review -->",
      interpretationNote: "<!-- shipflow:interpretation -->",
      markerPrefix: "<!-- shipflow:",
      intentGateCleared: "<!-- shipflow:intent-gate-cleared",
      escalationBannerEmoji: "\uD83D\uDEA7",
      escalationBannerHeading: "\uD83D\uDEA7 **Needs a human**",
      verificationManifestHeading: "Verification manifest",
      verificationComment: "<!-- shipflow:verification -->",
      precedentContext: "<!-- shipflow:precedent-context",
      precedentApplied: "<!-- shipflow:precedent-applied",
      intentGateHint: "<!-- shipflow:intent-gate-hint -->",
      intakeGateCleared: "<!-- shipflow:intake-gate-cleared",
      intakeGateHint: "<!-- shipflow:intake-gate-hint -->",
      intentGateParentConfirm: "<!-- shipflow:intent-gate-parent-confirm",
      reworkFrom: "<!-- shipflow:rework-from",
      escalateOnce: "<!-- shipflow:escalate-once",
      approvedHead: "<!-- shipflow:approved-head",
      judge: "<!-- shipflow:judge",
      judgeEnd: "<!-- shipflow:judge-end -->",
      intake: "<!-- shipflow:intake -->",
      by: "<!-- shipflow:by",
      provenanceFooter: "\uD83E\uDD16 ShipFlow"
    },
    intentGate: {
      $comment: "The release rule for the #190 intent gate (`needs-reporter-review`), single-sourced so the server's matcher, the CLI's ping comment and the skill docs cannot drift (issue #411 — the doc promised a rule the code did not implement). POLARITY: the label is a merge blocker held until a human CONFIRMS, so this is an AUTHORIZATION control, not a sentiment classifier. THE RULE: the quote-stripped body must reduce to EXACTLY ONE meaningful line — blank lines and pure-decoration lines (a `---` rule) are scaffolding, but a fenced block and everything in it COUNT as content — and that line, with leading/trailing markdown decoration and punctuation trimmed, must EQUAL one of `confirmationTokens` (case-insensitive, emoji skin-tone/variation modifiers normalised away). Nothing else clears the gate: the token is the WHOLE reply, or it does not confirm. WHY THE WHOLE BODY (PR #441, third review pass): whole-line equality judged `block[0]` and ignored everything after it, so a bare token on line 1 confirmed whatever followed. Measured through the real handler, all of `Confirmed`+`But scope it to the CLI only`, `\uD83D\uDC4D`+`not this implementation though`, `yes`+`Actually no, revert it`, `LGTM`+`hold the merge, this is wrong`, `confirmed`+`- but only the CLI half` CLEARED, and so did the blank-line forms `confirmed`+`Actually no, revert it` and `Yes`+`Actually no, revert it`. Every one is #411's exact harm: a merge on a reading the reporter had just narrowed. A SINGLE newline was enough, and that settles the scoping question — the rule ALREADY refuses extra words on the token's own line (`Confirmed — ship it` is armed), so accepting arbitrary text one newline later is incoherent: the same act, the same ambiguity, the opposite answer. Drawing the boundary at the line or at the paragraph only moves the hole down; this defect has now appeared at three granularities. Requiring the whole body is NOT the denylist the veto list was — it never inspects what follows, it refuses when anything follows. THE PRICE: `confirmed` plus a thank-you parks too. Accepted — commentary goes in a separate comment, costing one extra reply, never a wrong merge. A pasted fenced block counts as content here (unlike in the `N: answer` block parser, which skips fences whole so a fence's inner line can never be promoted to the judged line): `/confirm` over a fenced `no` was measured clearing, and a token with an attachment is not a token alone. WHY AN EXACT TOKEN AND NOT A GRAMMAR (PR #441, second review pass): the previous design matched an affirmative OPENING WORD and then vetoed a list of negations and contrastives found later in the paragraph. That is a denylist of known shapes guarding an unbounded set of free-form natural language — the exact anti-pattern this issue exists to close, re-earned inside its own fix. Negation-after-affirmative has no finite enumeration: `Confirmed the bug still repros`, `Yes, change the copy first` and `ok 1 - test passed` all survived a 27-word veto list, and each one FAILED OPEN — it merged a reading nobody confirmed. An exact token has the correct failure polarity for EVERY input, not merely for the inputs somebody remembered to enumerate: anything that is not the token leaves the gate armed, which one more reply fixes. Tokens must be unambiguous ALONE, as a whole line — that is what excludes `ok`, `sure`, `agreed`, `correct` and every bare imperative (`ship`, `merge`, `approve`, `proceed`), which read as consent or as an instruction depending on the sentence they open. The `N: answer` reply protocol also releases the gate, but it is held to the SAME stands-alone invariant as the token path (PR #441, fourth review pass): the decision block must BE the whole quote-stripped reply (no meaningful line outside it, a pasted fence included), EVERY line of that block must itself be a decision line, EVERY answer must be a `confirmationTokens` entry, and an escalation banner must actually be outstanding on the thread. Both positional checks are load-bearing and neither alone suffices — measured by ablation, the length test alone leaves `1: yes` + NEWLINE + `Actually no, revert it` clearing (same paragraph, so the counts match) and the per-line test alone leaves `1: yes` + BLANK LINE + `revert it` clearing (a later paragraph the block never reached). Reading the answers had fixed WHAT the block said but not WHERE it stopped, so this door stayed fail-OPEN at both granularities after the token path had closed both — and the escalation-outstanding guard does not mitigate it, because answering `N:` is exactly what a reporter does on an escalated thread — a content-agnostic `^\\\\d+:` match let `1: no, redo it` clear the blocker it was rejecting, and a pasted stack-trace line `10: undefined is not a function` do it by accident. FAIL-STUCK IS THE PRICE, and it is paid deliberately in two places, BOTH of which must state that the token is the whole reply or a reporter cannot discover it: `releaseHint` is the exact sentence the CLI puts on the PR when it APPLIES the label, and the server posts a one-time `intentGateHint` nudge naming the tokens whenever a human reply misses — including when the commenter's `author_association` is untrusted, which was the one branch that failed stuck in silence. Both render the token list FROM `confirmationTokens`, never from a hand-written copy, so neither can drift from the matcher — preserve that. Removing the label by hand stays the human override. Do NOT re-add a free-text grammar here to make it friendlier — narrowing the openers is safe, widening them is how this control dies. AUDIT AUTHOR (issue #537): `auditAuthorSlug` is the GitHub App slug that posts the `intentGateCleared` audit comment — the ONE bot identity the CLI's `isIntentGateAuditComment` trusts. It exists because the reader had to move to REST to see botness at all: `gh issue view --json comments` is GraphQL, where a Bot's `login` carries NO `[bot]` suffix and a GitHub App's `authorAssociation` is `NONE`, so the `[bot]`-suffix test the CLI shipped could never fire and the #411 clearance path was dead from the day it landed (measured on PR #489, gh 2.95.0). REST's `user.type == \"Bot\"` restores the signal — but botness ALONE is not identity: `gemini-code-assist[bot]` and `chatgpt-codex-connector[bot]` are also `type: Bot` and comment on these very PRs, so trusting any bot would trade a dead control for a forgeable one. The CLI therefore requires `user.type == \"Bot\"` AND the login, normalised (trailing `[bot]` stripped, case-folded), to EQUAL this slug. It is a ONE-ENTRY ALLOWLIST on purpose: this is an authorization predicate on a merge gate, and the failure mode of a wrong entry must be fail-STUCK (one more reporter reply, or a hand removal of the label — the standing human override), never fail-OPEN. A self-hosted deployment that installs the App under a different slug edits THIS key — never a literal in the CLI, and never by widening the rule to \"any bot\". The `[bot]` suffix is stripped rather than required because the two APIs disagree about it; the suffix is a rendering detail of REST, not an identity. A PAT-backed machine user has `type: \"User\"` and keeps clearing through the OWNER/MEMBER/COLLABORATOR association branch, which this key does not touch.",
      confirmationTokens: [
        "/confirm",
        "confirm",
        "confirmed",
        "approved",
        "yes",
        "lgtm",
        "sgtm",
        "ship it",
        "\uD83D\uDC4D",
        "+1"
      ],
      auditAuthorSlug: "renaissshipflow",
      releaseHint: "Reply with ONLY `confirmed` and nothing else (`/confirm`, `confirm`, `approved`, `yes`, `LGTM`, `sgtm`, `ship it`, `+1` and \uD83D\uDC4D also work). That one line must be the whole reply — extra words on it (`yes but …`), a second line, or a following paragraph are each read as a correction and leave this gate ON, by design. Send any commentary as a separate comment."
    },
    readability: {
      $comment: "Deterministic message-readability cap shared across GitHub surfaces: any single line that renders UNFOLDED over this many words is dense prose, not a scannable point — its detail belongs in a folded section. Enforced by the server's readability.VisibleLineWordCap (PR review + triage rendering) and the CLI's ACTION_LINE_WORD_LIMIT (loop escalation lint). ~20-word sentences plus room for a code reference.",
      visibleLineWordCap: 30
    },
    packetMarkers: {
      $comment: "Packet/triage markers the loop-reviewer blocking + neutral tables restate (issue #762). `cli` is today's emitter from packet.ts / project.ts (REVIEW_THREADS_UNAVAILABLE_MARKER, specUnavailableMarker, featureMapSkippedWarning, TRIAGE_UNAVAILABLE_MARKER, featureMapNotApplicableNote, specNotReadableIssueNote, plus the inline missing-brief line), placeholders #N / <repo> / … — no new wording, emitters stay byte-identical this slice. `cell` is today's skill-doc table cell (elided where the table already elided). Drift: scripts/check-degradation-markers.mjs binds contract.cell == fragment == consumer docs, and the CLI functions to contract.cli.",
      blocking: {
        reviewThreadsUnavailable: {
          cli: "⚠️ review threads UNAVAILABLE — unresolved count NOT determined",
          cell: "⚠️ review threads UNAVAILABLE — unresolved count NOT determined"
        },
        specUnavailable: {
          cli: "⚠️ **Brief NOT loaded — issue #N could not be read.** The brief is UNAVAILABLE, not absent: do NOT judge this PR without it, and do NOT hold the missing brief against the author. Re-run the packet, or read the issue directly.",
          cell: "⚠️ Brief NOT loaded — issue #N could not be read"
        },
        featureMapSkipped: {
          cli: "⚠️ WARNING shipflow-api feature map unavailable — per-feature evidence coverage NOT checked; packet omits the coverage lines: …",
          cell: "⚠️ WARNING shipflow-api feature map unavailable … NOT checked"
        },
        triageUnavailable: {
          cli: "⚠️ triage unavailable — ShipFlow context and relatedFiles NOT loaded",
          cell: "⚠️ triage unavailable — ShipFlow context and relatedFiles NOT loaded"
        }
      },
      neutral: {
        featureMapNotApplicable: {
          cli: "NOTE per-feature evidence coverage not applicable — no ShipFlow feature map covers <repo> (cross-repo --repo target); the coverage lines are omitted by design, not by failure.",
          cell: "NOTE per-feature evidence coverage not applicable — no ShipFlow feature map covers <repo> (cross-repo --repo target)"
        },
        specNotReadable: {
          cli: "NOTE #N is not a readable issue in <repo> — no acceptance brief to load; GitHub answered about it, so nothing went dark (the link is stale or names a PR).",
          cell: "NOTE #N is not a readable issue in <repo> — no acceptance brief to load"
        },
        missingBrief: {
          cli: "⚠️ **No linked issue/brief found.** Do NOT infer the spec from the diff — reviewing against a self-derived spec is a known silent failure. Flag the missing brief in your verdict.",
          cell: "⚠️ **No linked issue/brief found.**"
        }
      }
    }
  };
});

// src/pr-state.ts
function escalationReasonsOwed(cl) {
  return ESCALATE_ONCE_REASONS.filter((r) => cl.reasons.includes(r));
}
function classifyCheck(c) {
  const concl = (c.conclusion ?? "").toUpperCase();
  const status = (c.status ?? "").toUpperCase();
  const state = (c.state ?? "").toUpperCase();
  if (FAILING.has(concl) || FAILING.has(state))
    return "failing";
  if (status && status !== "COMPLETED" || PENDING.has(state))
    return "pending";
  if (concl === "SUCCESS" || state === "SUCCESS")
    return "passing";
  if (NO_VERDICT.has(concl))
    return "none";
  return "pending";
}
function ciStateOf(checks) {
  if (!checks || checks.length === 0)
    return "none";
  let failing = false;
  let pending = false;
  let passing = false;
  for (const c of checks) {
    const one = classifyCheck(c);
    if (one === "failing")
      failing = true;
    else if (one === "pending")
      pending = true;
    else if (one === "passing")
      passing = true;
  }
  if (failing)
    return "failing";
  if (pending)
    return "pending";
  if (passing)
    return "passing";
  return "none";
}
function foldLogin(s) {
  return s.trim().toLowerCase();
}
function prAttentionReasons(pr, me) {
  const reasons = [];
  if (pr.reviewDecision === "CHANGES_REQUESTED")
    reasons.push("changes_requested");
  const failing = (pr.statusCheckRollup ?? []).some((c) => FAILING.has((c.conclusion ?? "").toUpperCase()) || FAILING.has((c.state ?? "").toUpperCase()));
  if (failing)
    reasons.push("ci_failing");
  const fromOthers = (a) => !!a.author && foldLogin(a.author.login) !== foldLogin(me);
  const reviewFeedback = (pr.reviews ?? []).filter((r) => fromOthers(r) && (r.state === "CHANGES_REQUESTED" || r.state === "COMMENTED"));
  const otherComments = (pr.comments ?? []).filter(fromOthers);
  if (reviewFeedback.length || otherComments.length)
    reasons.push("review_comments");
  return reasons;
}
function issueNeedsReply(comments, me) {
  if (!comments?.length)
    return null;
  const last = comments[comments.length - 1];
  return last.author && foldLogin(last.author.login) !== foldLogin(me) ? last : null;
}
function hasApprovalLabel(pr) {
  return (pr.labels ?? []).some((l) => APPROVAL_LABELS.has(l.name.trim().toLowerCase()));
}
function commitSha(value) {
  if (typeof value !== "string")
    return null;
  const s = value.trim().toLowerCase();
  return /^[0-9a-f]{40}$/.test(s) ? s : null;
}
function renderApprovedHeadMarker(sha) {
  const bound = commitSha(sha);
  return `${APPROVED_HEAD_MARKER} sha=${bound ?? sha.trim().toLowerCase()} -->`;
}
function approvedHeadSha(comments) {
  if (!comments?.length)
    return null;
  let found = null;
  for (const c of comments) {
    if (!TRUSTED_AUTHOR_ASSOCIATIONS.has((c.authorAssociation ?? "").trim().toUpperCase()))
      continue;
    for (const line of stripQuotedLines(c.body).split(`
`)) {
      const raw = line.replace(/\r$/, "");
      if (raw !== raw.trimStart())
        continue;
      const m = APPROVED_HEAD_LINE.exec(raw.trimEnd());
      if (!m)
        continue;
      const sha = commitSha(m[1]);
      if (sha)
        found = sha;
    }
  }
  return found;
}
function isApproved(pr, headSha) {
  if (pr.reviewDecision === "APPROVED")
    return true;
  if (!hasApprovalLabel(pr))
    return false;
  const bound = approvedHeadSha(pr.comments);
  const current = commitSha(headSha !== undefined ? headSha : pr.headRefOid);
  return bound !== null && current !== null && bound === current;
}
function hoursSince(iso, nowMs = Date.now()) {
  if (!iso)
    return 0;
  const t = Date.parse(iso);
  if (Number.isNaN(t))
    return 0;
  return Math.max(0, (nowMs - t) / 3600000);
}
function commentArmsGate(c) {
  const b = stripQuotedLines(c.body);
  return b.includes(INTENT_GATE_NOTICE_HEADLINE) || b.includes(REWORK_FROM_MARKER);
}
function gateOpenedAt(pr, restClearedAt) {
  const comments = pr.comments ?? [];
  let clearedMs = -Infinity;
  let clearedIso;
  for (const c of comments) {
    if (!isIntentGateAuditComment({
      body: c.body,
      authorLogin: c.author?.login,
      authorAssociation: c.authorAssociation
    }))
      continue;
    const t = commentTs(c.createdAt);
    if (!Number.isFinite(t) || t <= clearedMs)
      continue;
    clearedMs = t;
    clearedIso = c.createdAt;
  }
  const restMs = commentTs(restClearedAt);
  if (Number.isFinite(restMs) && restMs > clearedMs) {
    clearedMs = restMs;
    clearedIso = restClearedAt;
  }
  let armedMs = -Infinity;
  let armedIso;
  for (const c of comments) {
    if (!commentIsMachinery(c) || !commentArmsGate(c))
      continue;
    const t = commentTs(c.createdAt);
    if (!Number.isFinite(t) || t <= clearedMs || t <= armedMs)
      continue;
    armedMs = t;
    armedIso = c.createdAt;
  }
  return armedIso ?? clearedIso ?? pr.createdAt;
}
function loopReviewable(pr) {
  if (pr.isDraft)
    return false;
  return linkedIssueNumbers(pr).length > 0;
}
function loopReviewedHead(pr, me, lastHeadAt) {
  const mine = (pr.reviews ?? []).filter((r) => !!r.author && foldLogin(r.author.login) === foldLogin(me));
  if (mine.length === 0)
    return false;
  const headMs = Date.parse(lastHeadAt ?? "");
  if (lastHeadAt == null || Number.isNaN(headMs))
    return true;
  return mine.some((r) => {
    const submitted = Date.parse(r.submittedAt ?? "");
    return !Number.isNaN(submitted) && submitted >= headMs;
  });
}
function classifyPR(pr, me, opts = {}) {
  let reasons = prAttentionReasons(pr, me);
  if (opts.unresolvedThreads === 0) {
    reasons = reasons.filter((r) => r !== "review_comments");
  } else if (opts.unresolvedThreads !== undefined && !reasons.includes("review_comments")) {
    reasons = [...reasons, "review_comments"];
  }
  const ciState = ciStateOf(pr.statusCheckRollup);
  const approved = isApproved(pr, opts.headSha);
  const ageHours = hoursSince(pr.updatedAt, opts.nowMs);
  const staleHours = opts.staleHours ?? 48;
  const conflicting = (pr.mergeable ?? "").toUpperCase() === "CONFLICTING";
  let state;
  let gateAgeHours;
  if (opts.intentBlocked) {
    const correction = reporterCorrectionOn(pr);
    const spent = reworkAttemptsOn(pr).length;
    const ceiling = opts.maxReworks ?? DEFAULT_MAX_REWORKS;
    gateAgeHours = hoursSince(gateOpenedAt(pr, opts.gateClearedAt), opts.nowMs);
    if (correction && spent < ceiling) {
      state = "reporter_corrected";
      reasons = [...reasons, REPORTER_REVIEW_REASON, REPORTER_CORRECTION_REASON];
    } else {
      state = "awaiting_reporter";
      reasons = [...reasons, REPORTER_REVIEW_REASON];
      if (correction)
        reasons = [...reasons, REWORK_CEILING_REASON];
      else if (correctionTrailUnreadable(pr))
        reasons = [...reasons, CORRECTION_UNREADABLE_REASON];
      if (gateAgeHours >= staleHours)
        reasons = [...reasons, REPORTER_GATE_STALE_REASON];
    }
    if (conflicting && !reasons.includes("merge_conflict"))
      reasons = [...reasons, "merge_conflict"];
  } else if (conflicting) {
    state = "conflict";
    if (!reasons.includes("merge_conflict"))
      reasons = [...reasons, "merge_conflict"];
  } else if (ciState === "failing")
    state = "ci_failing";
  else if (pr.reviewDecision === "CHANGES_REQUESTED")
    state = "changes_requested";
  else if (reasons.includes("review_comments"))
    state = "review_comments";
  else if (ciState === "pending")
    state = "ci_pending";
  else if (approved)
    state = "approved_ready";
  else if (loopReviewable(pr) && !loopReviewedHead(pr, me, opts.lastHeadAt))
    state = "needs_review";
  else if (ageHours >= staleHours)
    state = "stale";
  else
    state = "awaiting_review";
  const needsAction = state !== "ci_pending" && state !== "awaiting_reporter" && state !== "awaiting_review";
  if (needsAction && reasons.length === 0)
    reasons = [state];
  return {
    number: pr.number,
    state,
    ciState,
    approved,
    ageHours,
    reasons,
    needsAction,
    ...gateAgeHours === undefined ? {} : { gateAgeHours }
  };
}
function reviewedBeforeMerge(pr, mergedAt) {
  const mergeMs = Date.parse(mergedAt);
  if (Number.isNaN(mergeMs))
    return false;
  const mergedHead = commitSha(pr.headRefOid);
  if (mergedHead) {
    for (const c of pr.comments ?? []) {
      const t = Date.parse(c.createdAt);
      if (Number.isNaN(t) || t > mergeMs)
        continue;
      if (approvedHeadSha([c]) === mergedHead)
        return true;
    }
  }
  for (const r of pr.reviews ?? []) {
    if ((r.state ?? "").toUpperCase() !== "APPROVED")
      continue;
    const t = Date.parse(r.submittedAt ?? "");
    if (!Number.isNaN(t) && t <= mergeMs)
      return true;
  }
  const marker = SHIPFLOW_CONTRACT.markers.loopReview;
  for (const c of pr.comments ?? []) {
    if (!TRUSTED_AUTHOR_ASSOCIATIONS.has((c.authorAssociation ?? "").trim().toUpperCase()))
      continue;
    const t = Date.parse(c.createdAt);
    if (Number.isNaN(t) || t > mergeMs)
      continue;
    if (stripQuotedLines(c.body).includes(marker))
      return true;
  }
  for (const r of pr.reviews ?? []) {
    const t = Date.parse(r.submittedAt ?? "");
    if (Number.isNaN(t) || t > mergeMs)
      continue;
    if (stripQuotedLines(r.body).includes(marker))
      return true;
  }
  return false;
}
function selectMergedUnreviewed(merged, opts) {
  const nowMs = opts.nowMs ?? Date.now();
  return merged.filter((pr) => {
    const at = pr.mergedAt;
    if (!at)
      return false;
    if (Number.isNaN(Date.parse(at)))
      return false;
    if (hoursSince(at, nowMs) >= opts.staleHours)
      return false;
    return !reviewedBeforeMerge(pr, at);
  });
}
function classifyMergedUnreviewed(pr, opts = {}) {
  return {
    number: pr.number,
    state: "merged_unreviewed",
    ciState: ciStateOf(pr.statusCheckRollup),
    approved: false,
    ageHours: hoursSince(pr.mergedAt ?? undefined, opts.nowMs),
    reasons: [MERGED_UNREVIEWED_REASON],
    needsAction: false
  };
}
function intentGate(i) {
  const blocked = i.hasLabel || i.signal && !i.everCleared;
  const applyLabel = i.signal && !i.hasLabel && !i.everCleared;
  return { blocked, applyLabel };
}
function intentGateBlockedBy(i) {
  const label = i.hasLabel;
  const signal = i.signal && !i.everCleared;
  if (label && signal)
    return "both";
  if (label)
    return "label";
  if (signal)
    return "signal";
  return;
}
function lastMeaningfulLine(body) {
  const lines = body.split(`
`);
  for (let i = lines.length - 1;i >= 0; i--) {
    const t = lines[i].trim();
    if (t !== "")
      return t;
  }
  return "";
}
function intentGateAuditLineAnchored(body) {
  return INTENT_GATE_AUDIT_LINE.test(lastMeaningfulLine(body));
}
function normalizeBotLogin(login) {
  return (login ?? "").trim().toLowerCase().replace(/\[bot\]$/, "");
}
function isIntentGateAuditComment(c, trustedSlug) {
  if (!intentGateAuditLineAnchored(c.body))
    return false;
  const trusted = (typeof trustedSlug === "string" ? normalizeBotLogin(trustedSlug) : "") || INTENT_GATE_AUDIT_AUTHOR_SLUG;
  if (trusted !== "" && c.authorIsBot === true && normalizeBotLogin(c.authorLogin) === trusted)
    return true;
  return TRUSTED_AUTHOR_ASSOCIATIONS.has((c.authorAssociation ?? "").trim().toUpperCase());
}
function intakeGateAuditLineAnchored(body) {
  return INTAKE_GATE_AUDIT_LINE.test(lastMeaningfulLine(body));
}
function isIntakeGateAuditComment(c, trustedSlug) {
  if (!intakeGateAuditLineAnchored(c.body))
    return false;
  const trusted = (typeof trustedSlug === "string" ? normalizeBotLogin(trustedSlug) : "") || INTENT_GATE_AUDIT_AUTHOR_SLUG;
  if (trusted !== "" && c.authorIsBot === true && normalizeBotLogin(c.authorLogin) === trusted)
    return true;
  return TRUSTED_AUTHOR_ASSOCIATIONS.has((c.authorAssociation ?? "").trim().toUpperCase());
}
function intentGateEverCleared(e) {
  if (e.auditComments > 0)
    return true;
  return e.removals.some((r) => r.actorKnown && !r.actorIsBot);
}
function renderReworkFromMarker(commentId) {
  return `${REWORK_FROM_MARKER} id=${commentId} -->`;
}
function reworkAttemptsOn(pr) {
  const ids = [];
  const seen = new Set;
  for (const c of pr.comments ?? []) {
    if (!commentAuthorCouldBeLoop(c))
      continue;
    for (const m of stripQuotedLines(c.body).matchAll(REWORK_FROM_RE)) {
      if (seen.has(m[1]))
        continue;
      seen.add(m[1]);
      ids.push(m[1]);
    }
  }
  return ids;
}
function stripQuotedLines(body) {
  return (body ?? "").split(`
`).filter((l) => !l.trim().startsWith(">")).join(`
`);
}
function commentAuthorCouldBeLoop(c) {
  const login = (c.author?.login ?? "").trim();
  if (login.endsWith("[bot]"))
    return true;
  if (INTENT_GATE_AUDIT_AUTHOR_SLUG !== "" && normalizeBotLogin(login) === INTENT_GATE_AUDIT_AUTHOR_SLUG) {
    return true;
  }
  return TRUSTED_AUTHOR_ASSOCIATIONS.has((c.authorAssociation ?? "").trim().toUpperCase());
}
function commentIsMachinery(c) {
  const b = stripQuotedLines(c.body).trim();
  const marked = b.startsWith(SHIPFLOW_CONTRACT.markers.escalationBannerEmoji) || b.includes(SHIPFLOW_CONTRACT.markers.markerPrefix);
  return marked && commentAuthorCouldBeLoop(c);
}
function normalizeTokenLine(line) {
  return line.replace(/[\u{FE0E}\u{FE0F}\u{1F3FB}-\u{1F3FF}]/gu, "").replace(/^[>\s*_`#\-–—•]+/, "").replace(/[\s*_`.!,;:]+$/, "").trim().toLowerCase();
}
function isWholeLineConfirmation(body) {
  const lines = stripQuotedLines(body).split(`
`).map((l) => l.trim()).filter((l) => l !== "" && !/^[-*_]{3,}$/.test(l));
  if (lines.length !== 1)
    return false;
  return CONFIRMATION_TOKENS.has(normalizeTokenLine(lines[0]));
}
function commentTs(iso) {
  const t = Date.parse(iso ?? "");
  return Number.isNaN(t) ? -Infinity : t;
}
function reporterCorrectionOn(pr) {
  return scanForCorrection(pr).candidates[0] ?? null;
}
function reporterCorrectionsOn(pr) {
  return scanForCorrection(pr).candidates;
}
function correctionTrailUnreadable(pr) {
  return scanForCorrection(pr).unreadable;
}
function correctionHorizon(comments) {
  const byId = new Map;
  for (const c of comments)
    if (c.id)
      byId.set(c.id, c);
  let horizon = -Infinity;
  for (const c of comments) {
    if (!commentIsMachinery(c))
      continue;
    const authored = stripQuotedLines(c.body);
    const named = [...authored.matchAll(REWORK_FROM_RE)].map((m) => m[1]);
    if (named.length > 0) {
      for (const id of named) {
        const answeredAt = commentTs(byId.get(id)?.createdAt);
        horizon = Math.max(horizon, Number.isFinite(answeredAt) ? answeredAt : commentTs(c.createdAt));
      }
    } else if (authored.includes(SHIPFLOW_CONTRACT.markers.reworkFrom)) {
      horizon = Math.max(horizon, commentTs(c.createdAt));
    }
  }
  return horizon;
}
function scanForCorrection(pr) {
  const comments = pr.comments ?? [];
  if (comments.length === 0)
    return { candidates: [], unreadable: false };
  const answered = new Set(reworkAttemptsOn(pr));
  const trailLegible = comments.some(commentIsMachinery);
  const horizon = correctionHorizon(comments);
  const eligible = [];
  for (const c of comments) {
    if (commentIsMachinery(c))
      continue;
    if (!TRUSTED_AUTHOR_ASSOCIATIONS.has((c.authorAssociation ?? "").trim().toUpperCase()))
      continue;
    if (c.id && answered.has(c.id))
      continue;
    if (stripQuotedLines(c.body).trim() === "")
      continue;
    if (isWholeLineConfirmation(c.body))
      continue;
    eligible.push(c);
  }
  if (!trailLegible)
    return { candidates: [], unreadable: eligible.length > 0 };
  const candidates = eligible.filter((c) => commentTs(c.createdAt) > horizon).sort((a, b) => commentTs(a.createdAt) - commentTs(b.createdAt));
  return { candidates: candidates.slice(0, MAX_CORRECTION_CANDIDATES), unreadable: false };
}
function reporterCorrectionRow(c) {
  const flat = (c.body ?? "").replace(/\s+/g, " ").trim();
  return {
    id: c.id ?? "",
    author: c.author?.login ?? "",
    at: c.createdAt ?? "",
    url: c.url ?? "",
    excerpt: flat.length > CORRECTION_EXCERPT_CHARS ? `${flat.slice(0, CORRECTION_EXCERPT_CHARS - 1)}…` : flat
  };
}
function partOfIssueNumbers(body) {
  const out = [];
  for (const m of (body ?? "").matchAll(PART_OF_ISSUE_RE)) {
    const n = parseInt(m[1], 10);
    if (n > 0 && !out.includes(n))
      out.push(n);
  }
  return out;
}
function linkedIssueNumbers(pr) {
  const out = (pr.closingIssuesReferences ?? []).map((i) => i.number);
  for (const n of partOfIssueNumbers(pr.body))
    if (!out.includes(n))
      out.push(n);
  return out;
}
function settleReviewLogin(r) {
  if (typeof r.author === "string")
    return r.author.trim();
  return (r.author?.login ?? "").trim();
}
function reviewSettle(input) {
  const settleMs = input.settleMs ?? REVIEW_SETTLE_MS;
  const headMs = Date.parse(input.lastHeadAt ?? "");
  if (input.lastHeadAt == null || Number.isNaN(headMs)) {
    return { settled: false, remainingMs: 0, reason: "unavailable" };
  }
  const remainingMs = Math.max(0, settleMs - (input.nowMs - headMs));
  if (input.nowMs - headMs >= settleMs)
    return { settled: true, remainingMs: 0 };
  const me = foldLogin(input.me);
  if (me !== "") {
    for (const r of input.reviews) {
      const login = settleReviewLogin(r);
      if (!login || foldLogin(login) === me)
        continue;
      const submitted = Date.parse(r.submittedAt ?? "");
      if (Number.isNaN(submitted) || submitted < headMs)
        continue;
      return { settled: true, remainingMs };
    }
  }
  return { settled: false, remainingMs, reason: "pending" };
}
function mergeDecision(pr, me, opts) {
  const cl = classifyPR(pr, me, { staleHours: opts.staleHours, nowMs: opts.nowMs, unresolvedThreads: opts.unresolvedThreads, intentBlocked: opts.intentBlocked, headSha: opts.headSha });
  const blockers = [];
  if (opts.policy === "manual")
    blockers.push("merge-policy is manual (human merge required)");
  if (cl.ciState === "failing")
    blockers.push("CI is failing");
  if (cl.ciState === "pending")
    blockers.push("CI still running");
  let unsatisfiable = false;
  if (opts.requireCi && cl.ciState === "none") {
    const rollup = pr.statusCheckRollup ?? [];
    const zeroChecks = rollup.length === 0;
    const zeroCheckAgeH = hoursSince(pr.createdAt, opts.nowMs);
    const noCiComing = pr.createdAt != null && zeroCheckAgeH >= NO_CI_GRACE_HOURS;
    if (opts.policy !== "manual" && noCiComing) {
      unsatisfiable = true;
      blockers.push(zeroChecks ? "require-ci is on but no CI has reported and none is coming — add a workflow that runs on PRs, or run: renaiss-shipflow config set require-ci false" : "require-ci is on but checks ran and validated nothing — fix path filters or configure a required/always-run check, or run: renaiss-shipflow config set require-ci false");
    } else {
      blockers.push("no CI checks to confirm (set require-ci=false to allow)");
    }
  }
  if (pr.reviewDecision === "CHANGES_REQUESTED")
    blockers.push("changes requested");
  if ((opts.unresolvedThreads ?? 0) > 0)
    blockers.push(`${opts.unresolvedThreads} unresolved review thread(s) — address + resolve them first`);
  if ((pr.mergeable ?? "").toUpperCase() === "CONFLICTING")
    blockers.push("merge conflict with base (run: pr sync <n>)");
  if (opts.behindBy === null) {
    if (opts.freshnessUnresolvable) {
      if (opts.policy !== "manual")
        unsatisfiable = true;
      blockers.push("base comparison impossible — the head ref does not resolve for compare (deleted branch/fork, or a cross-repo head with no owner); never merge on unknown freshness");
    } else {
      blockers.push("base comparison unavailable — never merge on unknown freshness; retry next tick");
    }
  } else if (opts.behindBy !== undefined && opts.behindBy > 0) {
    blockers.push(`behind base by ${opts.behindBy} commit(s) — rebase first (run: pr sync <n>) so CI re-runs on the rebased head`);
  }
  if (opts.policy === "auto-on-green" && !cl.approved) {
    blockers.push(hasApprovalLabel(pr) ? STALE_APPROVAL_BLOCKER : "not approved (needs a GitHub review approval or a shipflow-approved label)");
  }
  if (opts.policy === "auto-timeout" && !cl.approved && cl.ageHours < opts.staleHours) {
    blockers.push(`awaiting approval or the ${opts.staleHours}h timeout (age ${Math.round(cl.ageHours)}h)`);
  }
  if (opts.intentBlocked) {
    blockers.push(opts.intentBlockedBy ? `${INTENT_BLOCKER} (${INTENT_BLOCKED_BY_DETAIL[opts.intentBlockedBy]})` : INTENT_BLOCKER);
  }
  if (opts.lastHeadAt !== undefined) {
    const settle = reviewSettle({
      lastHeadAt: opts.lastHeadAt,
      nowMs: opts.nowMs ?? Date.now(),
      reviews: [...pr.reviews ?? [], ...opts.settleReviews ?? []],
      me,
      settleMs: opts.settleMs
    });
    if (!settle.settled) {
      blockers.push(settle.reason === "unavailable" ? REVIEW_SETTLE_UNAVAILABLE : REVIEW_SETTLE_BLOCKER);
    }
  }
  return { policy: opts.policy, wouldMerge: blockers.length === 0, blockers, ...unsatisfiable ? { unsatisfiable: true } : {} };
}
function headTrust(pr) {
  if (pr.isCrossRepository !== false)
    return "fork-head";
  if (pr.associationLookupFailed)
    return "association-unknown";
  if (!TRUSTED_AUTHOR_ASSOCIATIONS.has((pr.authorAssociation ?? "").trim().toUpperCase()))
    return "untrusted-author";
  return null;
}
function foreignConflictedPRs(mine, all, me, opts = {}) {
  if (opts.enabled !== true)
    return [];
  const mineNums = new Set(mine.map((p) => p.number));
  return all.filter((p) => !mineNums.has(p.number) && !p.isDraft && (p.mergeable ?? "").toUpperCase() === "CONFLICTING" && foldLogin(p.author?.login ?? "") !== foldLogin(me)).map((pr) => {
    const distrust = headTrust(pr);
    return distrust ? { pr, trusted: false, distrust } : { pr, trusted: true };
  });
}
var FAILING, PENDING, NO_VERDICT, APPROVAL_LABELS, REPORTER_REVIEW_REASON, REPORTER_CORRECTION_REASON = "reporter_correction", REWORK_CEILING_REASON = "rework_ceiling", CORRECTION_UNREADABLE_REASON = "correction_unreadable", REPORTER_GATE_STALE_REASON = "reporter_gate_stale", MERGED_UNREVIEWED_REASON = "merged_unreviewed", ESCALATE_ONCE_REASONS, APPROVED_HEAD_MARKER, APPROVED_HEAD_LINE, STALE_APPROVAL_BLOCKER = "stale-approval", INTENT_GATE_NOTICE_HEADLINE = "⏸️ **Merge blocked — awaiting the reporter's confirmation**", INTENT_BLOCKER = "unconfirmed interpretation — needs reporter confirmation", INTENT_BLOCKED_BY_DETAIL, INTENT_GATE_OVERRIDE_DETAIL, INTENT_GATE_AUDIT_MARKER, INTENT_GATE_AUDIT_LINE, INTENT_GATE_AUDIT_AUTHOR_SLUG, INTAKE_GATE_AUDIT_MARKER, INTAKE_GATE_AUDIT_LINE, REWORK_FROM_MARKER, DEFAULT_MAX_REWORKS = 3, REWORK_FROM_RE, CONFIRMATION_TOKENS, MAX_CORRECTION_CANDIDATES = 5, CORRECTION_EXCERPT_CHARS = 200, PART_OF_ISSUE_RE, NO_CI_GRACE_HOURS = 0.25, REVIEW_SETTLE_MS = 120000, REVIEW_SETTLE_BLOCKER = "external reviews still settling — last head is too recent and no external review has landed since", REVIEW_SETTLE_UNAVAILABLE = "last-head clock unavailable — never merge on unknown review-settle state", TRUSTED_AUTHOR_ASSOCIATIONS;
var init_pr_state = __esm(() => {
  init_shipflow_contract_data();
  FAILING = new Set(["FAILURE", "TIMED_OUT", "CANCELLED", "ACTION_REQUIRED", "ERROR", "STARTUP_FAILURE"]);
  PENDING = new Set(["PENDING", "EXPECTED", "QUEUED", "IN_PROGRESS", "WAITING", "REQUESTED"]);
  NO_VERDICT = new Set(["NEUTRAL", "SKIPPED"]);
  APPROVAL_LABELS = new Set([SHIPFLOW_CONTRACT.labels.names.shipflowApproved, "approved", "✅ approved"]);
  REPORTER_REVIEW_REASON = SHIPFLOW_CONTRACT.labels.names.needsReporterReview;
  ESCALATE_ONCE_REASONS = [
    REWORK_CEILING_REASON,
    CORRECTION_UNREADABLE_REASON,
    REPORTER_GATE_STALE_REASON,
    MERGED_UNREVIEWED_REASON
  ];
  APPROVED_HEAD_MARKER = SHIPFLOW_CONTRACT.markers.approvedHead;
  APPROVED_HEAD_LINE = new RegExp(`^${APPROVED_HEAD_MARKER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+sha=(\\S+?)\\s*-->$`);
  INTENT_BLOCKED_BY_DETAIL = {
    label: "blocking input: the `needs-reporter-review` label",
    signal: "blocking input: the PR body's interpretation/deviation signal (no label to remove — removal would be a no-op; reply with a confirmation token; token-less path: apply-then-clear)",
    both: "blocking input: both the `needs-reporter-review` label and the PR body's interpretation/deviation signal"
  };
  INTENT_GATE_OVERRIDE_DETAIL = {
    label: `(no reply) remove the \`${REPORTER_REVIEW_REASON}\` label`,
    both: `(no reply) remove the \`${REPORTER_REVIEW_REASON}\` label`,
    signal: `label removal would be a no-op (no \`${REPORTER_REVIEW_REASON}\` on this PR). Reply with a confirmation token; token-less path is apply-then-clear`
  };
  INTENT_GATE_AUDIT_MARKER = SHIPFLOW_CONTRACT.markers.intentGateCleared;
  INTENT_GATE_AUDIT_LINE = new RegExp(`^${INTENT_GATE_AUDIT_MARKER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} by=\\S+ -->$`);
  INTENT_GATE_AUDIT_AUTHOR_SLUG = normalizeBotLogin(SHIPFLOW_CONTRACT.intentGate.auditAuthorSlug);
  INTAKE_GATE_AUDIT_MARKER = SHIPFLOW_CONTRACT.markers.intakeGateCleared;
  INTAKE_GATE_AUDIT_LINE = new RegExp(`^${INTAKE_GATE_AUDIT_MARKER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} by=\\S+ -->$`);
  REWORK_FROM_MARKER = SHIPFLOW_CONTRACT.markers.reworkFrom;
  REWORK_FROM_RE = new RegExp(`${REWORK_FROM_MARKER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+id=(\\S+?)\\s*-->`, "g");
  CONFIRMATION_TOKENS = new Set(SHIPFLOW_CONTRACT.intentGate.confirmationTokens.map((t) => t.toLowerCase()));
  PART_OF_ISSUE_RE = /Part of #(\d+)/gi;
  TRUSTED_AUTHOR_ASSOCIATIONS = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);
});

// src/escalation-format.ts
function bulletizeReason(reason) {
  if (reason.includes(`
`))
    return reason;
  return enumerateReason(reason, /\s*\((\d+)\)\s*/, "1", (m, text) => `${m}. ${text}`) ?? enumerateReason(reason, /\s*\(([a-z])\)\s*/, "a", (_m, text) => `- ${text}`) ?? reason;
}
function enumerateReason(reason, marker, firstMarker, line) {
  const parts = reason.split(marker);
  if (parts.length < 5)
    return null;
  const lead = parts[0].trim();
  if (parts[1] !== firstMarker)
    return null;
  const items = [];
  for (let i = 1;i + 1 < parts.length; i += 2) {
    const itemText = parts[i + 1].replace(/[;.\s]+$/, "").trim();
    if (!itemText)
      continue;
    items.push(line(parts[i], itemText));
  }
  if (items.length < 2)
    return null;
  return lead ? `${lead}

${items.join(`
`)}` : items.join(`
`);
}
function prodAccessOptionLines(reason) {
  const out = [];
  for (const raw of reason.split(`
`)) {
    const line = raw.trim();
    if (!/\bloop\b/i.test(line))
      continue;
    if (!/\b(grant(?:s|ed|ing)?|give|hand|share|provide|expose)\b/i.test(line))
      continue;
    const prodNoun = /(DATABASE_URL|\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*_(?:KEY|SECRET|TOKEN|URL)\b|\bprod(?:uction)?\s+(?:db|database|credentials?|secrets?|access|api\s*keys?|env)\b|\b(?:access|credentials?|secrets?)\s+(?:to|for|on)\s+(?:the\s+)?prod(?:uction)?\b|\bapi\s*keys?\b)/;
    if (!prodNoun.test(line))
      continue;
    if (/\b(do\s+not|don'?t|never|no)\s+(?:\w+\s+){0,2}(grant|give|hand|share|provide|expose)/i.test(line))
      continue;
    out.push(line);
  }
  return out;
}
function isActionHeading(heading) {
  return /action\s+needed/i.test(heading);
}
function foldSecondarySections(reason) {
  if (!/^###\s/m.test(reason))
    return reason;
  const sections = [{ heading: null, lines: [] }];
  for (const line of reason.split(`
`)) {
    if (/^###\s/.test(line))
      sections.push({ heading: line.replace(/^#+\s*/, "").trim(), lines: [] });
    else
      sections[sections.length - 1].lines.push(line);
  }
  const anyAction = sections.some((s) => s.heading && isActionHeading(s.heading));
  let firstHeaded = true;
  const visibleParts = [];
  const folded = [];
  for (const s of sections) {
    const body = s.lines.join(`
`).trim();
    if (s.heading === null) {
      if (body)
        visibleParts.push(body);
      continue;
    }
    const visible = anyAction ? isActionHeading(s.heading) : firstHeaded;
    firstHeaded = false;
    if (visible)
      visibleParts.push(`### ${s.heading}
${body}`);
    else
      folded.push(s);
  }
  if (folded.length) {
    const summary = folded.map((s) => s.heading).join(" · ");
    const inner = folded.map((s) => folded.length === 1 ? s.lines.join(`
`).trim() : `**${s.heading}**

${s.lines.join(`
`).trim()}`).join(`

`);
    visibleParts.push(`<details>
<summary><b>${summary}</b></summary>

${inner}

</details>`);
  }
  return visibleParts.join(`

`);
}
function detectReplyOnPr(reason) {
  for (const line of reason.split(`
`)) {
    if (!/\bconfirm/i.test(line))
      continue;
    const m = /\bPR\s*#(\d+)/i.exec(line);
    if (m)
      return parseInt(m[1], 10);
  }
  return;
}
function actionSectionLineCount(reason) {
  let inAction = false;
  let n = 0;
  for (const line of reason.split(`
`)) {
    if (/^###\s/.test(line)) {
      inAction = isActionHeading(line);
      continue;
    }
    if (inAction && line.trim())
      n++;
  }
  return n;
}
function normalizeOwner(raw) {
  const login = (raw ?? "").trim().replace(/^@/, "");
  return login || undefined;
}
function proseWordCount(text) {
  return text.replace(/`[^`]+`/g, "code").split(/\s+/).filter(Boolean).length;
}
function overlongActionLines(reason) {
  const offenders = [];
  let inActionSection = false;
  let inFence = false;
  for (const line of reason.split(`
`)) {
    if (/^\s*```/.test(line.trim())) {
      inFence = !inFence;
      continue;
    }
    if (inFence)
      continue;
    if (/^###\s/.test(line)) {
      inActionSection = isActionHeading(line);
      continue;
    }
    if (!inActionSection)
      continue;
    const t = line.trim();
    if (t.startsWith("|")) {
      const cells = t.replace(/^\|/, "").replace(/\|$/, "").split("|");
      if (cells.some((cell) => proseWordCount(cell) > ACTION_LINE_WORD_LIMIT))
        offenders.push(t);
      continue;
    }
    if (proseWordCount(line) > ACTION_LINE_WORD_LIMIT)
      offenders.push(t);
  }
  return offenders;
}
function lintEscalationReason(reason) {
  const r = reason.trim();
  const problems = [];
  if (!r)
    return ["no reason given — state the decision or action the human must take"];
  if (/\?\s*$/m.test(r) && !/\*\*recommendation:?\*\*/i.test(r)) {
    problems.push(`contains an open question ("?") but no **Recommendation:** line — every question put to a human must carry the loop's recommended answer`);
  }
  if (/see the issue body/i.test(r)) {
    problems.push('says "see the issue body" — an escalation must be self-contained; inline the substance');
  }
  const tableHeader = /^\s*\|\s*#\s*\|([^\n]*)$/m.exec(r);
  const hasDecisionTable = !!tableHeader && /\|\s*recommendation\s*\|/i.test(tableHeader[1]);
  if (hasDecisionTable && /^\s*\*\*recommendation:?\*\*/im.test(r)) {
    problems.push("carries both a decision table with a Recommendation column and a separate **Recommendation:** line — state each recommendation once, in the table row it belongs to");
  }
  if (tableHeader && !/if chosen|consequence|outcome|then|result/i.test(tableHeader[1])) {
    const rows = r.split(`
`).filter((l) => /^\s*\|\s*\d+\s*\|/.test(l));
    if (rows.length && !rows.every((l) => l.includes("→"))) {
      problems.push("decision table has no **If chosen** column — each option must say what happens when picked: `| # | Decision | Recommendation | If chosen |`");
    }
  }
  const actionLines = actionSectionLineCount(r);
  if (actionLines > ACTION_SECTION_LINE_CAP) {
    problems.push(`"Action needed" section is ${actionLines} visible lines — cap ${ACTION_SECTION_LINE_CAP}: one line per step or option, move detail into a "### Why it's blocked" section (it folds)`);
  }
  if (r.includes(`
`) && !r.split(`
`).some((l) => /^###\s/.test(l) && isActionHeading(l))) {
    problems.push('structured reason is missing the "### \uD83D\uDC64 Action needed" section — lead with the concrete steps');
  }
  for (const line of prodAccessOptionLines(r)) {
    problems.push(`offers the loop production access ("${line.slice(0, 60)}…") — the loop never gets a prod DATABASE_URL/secret; ` + 'make the option "operator runs it" or "reproduce on a local DB first"');
  }
  const hasReplyOption = /^\s*(?:[-*]\s*)?`?\d+:\s+\S/m.test(r);
  if (r.includes(`
`) && !tableHeader && !hasReplyOption) {
    problems.push("no enumerated reply — end with the replies a human can type and what each does, e.g. `1: done → loop re-reviews` / `1: skip → loop parks this`");
  }
  for (const line of overlongActionLines(r)) {
    problems.push(`"Action needed" line over ${ACTION_LINE_WORD_LIMIT} words ("${line.slice(0, 60)}…") — ` + `a step (or table cell) must read in one breath; move the detail to "### Why it's blocked" (it renders folded)`);
  }
  return problems;
}
function parseDecisionReplies(body) {
  if (!body)
    return [];
  const byNumber = new Map;
  const marker = /(?:^|,)\s*(\d+)\s*:\s*([^]*?)(?=,\s*\d+\s*:|$)/g;
  for (const line of body.split(`
`)) {
    if (!/^\s*\d+\s*:/.test(line))
      continue;
    for (const m of line.matchAll(marker)) {
      const answer = m[2].trim();
      if (answer)
        byNumber.set(Number(m[1]), answer);
    }
  }
  return [...byNumber].map(([n, answer]) => ({ n, answer }));
}
function parseDecisionRepliesLoose(body) {
  if (!body)
    return [];
  const byNumber = new Map;
  for (const line of body.split(`
`)) {
    if (/^\s*\d+\s*:/.test(line)) {
      for (const d of parseDecisionReplies(line))
        byNumber.set(d.n, d.answer);
      continue;
    }
    const m = DECISION_LOOSE_LINE.exec(line);
    if (!m)
      continue;
    const answer = m[2].trim();
    if (answer)
      byNumber.set(Number(m[1]), answer);
  }
  return [...byNumber].map(([n, answer]) => ({ n, answer }));
}
function ackCell(s) {
  let out = neutralizeInline(s.replace(/`/g, ""));
  if ([...out].length > 80)
    out = [...out].slice(0, 79).join("").trimEnd() + "…";
  return out;
}
function renderReplyAck(decisions) {
  const read = decisions.length ? decisions.map((d) => "`" + `${d.n}: ${ackCell(d.answer)}` + "`").join(" · ") : "a free-text decision";
  return `✅ **Reply received** — read as ${read}; the loop resumes on its next pass.

${SHIPFLOW_CONTRACT.markers.loop}`;
}
function findHumanReplyAfterEscalation(comments) {
  let banner = -1;
  comments.forEach((c, i) => {
    if (c.viewerDidAuthor !== false && isEscalationBanner(c.body))
      banner = i;
  });
  if (banner < 0)
    return null;
  for (let i = comments.length - 1;i > banner; i--) {
    const c = comments[i];
    if ((c.authorLogin ?? "").endsWith("[bot]"))
      continue;
    const typed = stripQuotedLines(c.body).trim();
    if (!typed || isEscalationBanner(typed) || typed.includes(SHIPFLOW_CONTRACT.markers.markerPrefix))
      continue;
    return { index: i, body: typed };
  }
  return null;
}
function encodePrecedentContext(category, reason) {
  const q = Buffer.from(reason, "utf8").toString("base64");
  return `${SHIPFLOW_CONTRACT.markers.precedentContext} cat=${category} q=${q} -->`;
}
function renderEscalateOnceMarker(pr, reason) {
  return `${SHIPFLOW_CONTRACT.markers.escalateOnce} pr=${pr} reason=${reason} -->`;
}
function parseEscalateOnceKey(forPr, onceReason) {
  const raw = (forPr ?? "").trim();
  const reason = (onceReason ?? "").trim();
  if (!raw && !reason)
    return;
  if (!raw || !reason) {
    return new Error("--for-pr and --once-reason must be given together — a half-written escalate-once key suppresses nothing and the PR re-escalates every tick (issue #488).");
  }
  if (!/^#?\d+$/.test(raw) || Number(raw.replace("#", "")) <= 0) {
    return new Error(`--for-pr ${JSON.stringify(forPr)} is not a PR number.`);
  }
  if (!ESCALATE_ONCE_REASONS.includes(reason)) {
    return new Error(`--once-reason ${JSON.stringify(onceReason)} is not an escalate-once reason — valid: ${ESCALATE_ONCE_REASONS.join(", ")}. Copy it from the inbox row's \`escalateOnceReason\`.`);
  }
  return { pr: Number(raw.replace("#", "")), reason };
}
function escalateOnceLineRe(pr, reason, flags = "m") {
  const token = SHIPFLOW_CONTRACT.markers.escalateOnce.replace(RE_ESCAPE, "\\$&");
  return new RegExp(`^${token}[ \\t]+pr=${pr}[ \\t]+reason=${reason}[ \\t]*-->[ \\t\\r]*$`, flags);
}
function isEscalationBanner(body) {
  return !!body && body.trimStart().startsWith(SHIPFLOW_CONTRACT.markers.escalationBannerHeading);
}
function hasEscalateOnceMarker(body, pr, reason) {
  if (!body || !reason || !isEscalationBanner(body))
    return false;
  return escalateOnceLineRe(String(pr), reason.replace(RE_ESCAPE, "\\$&")).test(body);
}
function extractEscalateOnceMarkers(body) {
  if (!body || !isEscalationBanner(body))
    return [];
  const found = body.match(escalateOnceLineRe("\\d+", "[^\\s>]+", "gm")) ?? [];
  return [...new Set(found.map((l) => l.trim()))];
}
function preserveEscalateOnceMarkers(next, existing) {
  const kept = extractEscalateOnceMarkers(existing).filter((m) => !extractEscalateOnceMarkers(next).includes(m));
  return kept.length ? `${next}
${kept.join(`
`)}` : next;
}
function neutralizeMarkers(text) {
  const prefix = SHIPFLOW_CONTRACT.markers.markerPrefix;
  return String(text ?? "").split(prefix).join(`&lt;${prefix.slice(1)}`);
}
function neutralizeInline(text) {
  return neutralizeMarkers(String(text ?? "").replace(/\s+/g, " ").trim());
}
function inlineNumber(value) {
  return Number(value);
}
function formatPrecedentSuggestion(m) {
  const p = m.precedent;
  if (!p)
    return "";
  const note = m.classDemoted ? "This class was demoted after reversals — it is never auto-applied." : m.outcome === "reconfirm" ? "It is due for re-confirmation — confirm it still holds." : "This class is never auto-applied — reply to reuse it or answer fresh.";
  return [
    "<details>",
    "<summary><b>Precedent on file — you answered this before</b></summary>",
    "",
    `On #${inlineNumber(p.sourceIssue)}, @${neutralizeInline(p.author)} answered: "${neutralizeMarkers(p.answer)}" ([original reply](${neutralizeInline(p.sourceUrl)})).`,
    `Reply \`same\` to reuse it, or answer fresh. ${note}`,
    "",
    "</details>"
  ].join(`
`);
}
function formatPrecedentDisclosure(m) {
  const p = m.precedent;
  if (!p)
    return "";
  const category = neutralizeInline(m.category);
  return [
    `\uD83D\uDD01 **Auto-resolved per your #${inlineNumber(p.sourceIssue)} decision** — reply \`undo\` to reverse it.`,
    "",
    `**Decision reused:** "${neutralizeMarkers(p.answer)}" — @${neutralizeInline(p.author)}, [original reply](${neutralizeInline(p.sourceUrl)})`,
    "",
    "<details>",
    `<summary><b>What was auto-applied — ${category}</b></summary>`,
    "",
    `**Matched precedent:** \`${neutralizeInline(m.fingerprint)}\` · reuse ${inlineNumber(p.reuseCount)} · expires ${neutralizeInline(String(p.expiresAt ?? "").slice(0, 10))}`,
    "**Undo:** one reply `undo` (or `no`) reverses this, retires the precedent, and re-escalates the question to you.",
    "",
    "</details>",
    `${SHIPFLOW_CONTRACT.markers.precedentApplied} pid=${neutralizeInline(p.id)} cat=${category} -->`
  ].join(`
`);
}
function findLatestEscalationComment(comments) {
  for (let i = comments.length - 1;i >= 0; i--) {
    const c = comments[i];
    if (c.viewerDidAuthor === false)
      continue;
    if (isEscalationBanner(c.body))
      return c;
  }
  return null;
}
function formatEscalationBody(reason, opts = {}) {
  if (opts.category && !(opts.category in ESCALATION_CATEGORIES)) {
    throw new Error(`Unknown escalation category "${opts.category}" — valid: ${Object.keys(ESCALATION_CATEGORIES).join(", ")}`);
  }
  const why = foldSecondarySections(bulletizeReason(neutralizeMarkers(reason.trim()))) || "_No reason given._";
  const owner = normalizeOwner(opts.owner);
  const tail = [
    ...opts.category ? [neutralizeInline(opts.category)] : [],
    ...owner ? [`@${neutralizeInline(owner)} decides`] : []
  ];
  const banner = tail.length ? `${SHIPFLOW_CONTRACT.markers.escalationBannerHeading} — ${tail.join(" · ")}` : ESCALATION_BANNER;
  const replyOnPr = opts.repo ? detectReplyOnPr(reason) : undefined;
  const replyOn = replyOnPr ? [`**Reply on PR #${replyOnPr}, not here →** https://github.com/${neutralizeInline(opts.repo)}/pull/${replyOnPr}#new_comment_field`, ""] : [];
  const rationale = opts.category ? ESCALATION_CATEGORIES[opts.category].split(/(?<=\.)\s/)[0] : "";
  return [
    banner,
    "",
    ...replyOn,
    why,
    "",
    "---",
    `<sub>Reply \`1: <answer>\` per numbered item (\`1.\` / \`1)\` work too) — the **\`${SHIPFLOW_CONTRACT.labels.names.needsHuman}\`** label clears automatically, the loop acknowledges and resumes.` + (rationale ? ` Why a human — ${opts.category}: ${rationale}` : "") + "</sub>",
    ...opts.category ? [encodePrecedentContext(opts.category, reason.trim())] : [],
    ...opts.once ? [renderEscalateOnceMarker(opts.once.pr, opts.once.reason)] : []
  ].join(`
`);
}
var ESCALATION_CATEGORIES, ACTION_SECTION_LINE_CAP = 10, ACTION_LINE_WORD_LIMIT, DECISION_LOOSE_LINE, RE_ESCAPE, ESCALATION_BANNER;
var init_escalation_format = __esm(() => {
  init_shipflow_contract_data();
  init_pr_state();
  ESCALATION_CATEGORIES = {
    "money-write": "Enabling this writes real money-bearing values (prices, payouts, billing) to live systems. " + "A bad value reaches customers immediately, and transactions made at a wrong value can't be " + "undone by reverting data. The loop never self-authorizes money writes — a human owns the go/no-go.",
    "prod-config": "This changes production configuration (env vars, flags, infrastructure) whose blast radius " + "spans everything behind it; a mistake can take production down or silently change live " + "behavior. The loop never applies production config itself.",
    security: "This touches a security- or trust-critical surface (authn/authz, secrets, injection-prone " + "parsing) where a mistake is exploitable and autonomous validation can't establish safety.",
    "missing-secret": "The work is blocked on a credential, secret, or account only a human can provision. Nothing " + "is wrong with the code — the loop lacks access it cannot grant itself. Production data access " + "is never the remedy: the loop works against a local DB, and a prod write is the operator's step.",
    "external-dependency": "Blocked on an external system or third party (vendor approval, DNS, a service outside this " + "repo) that the loop cannot drive.",
    invalid: "The issue looks invalid, duplicate, or out of scope; closing someone's issue is a judgment " + "call the loop leaves to a human."
  };
  ACTION_LINE_WORD_LIMIT = SHIPFLOW_CONTRACT.readability.visibleLineWordCap;
  DECISION_LOOSE_LINE = /^\s*(\d+)(?:[.)]\s+|\s+[-–]\s+)(\S.*)$/;
  RE_ESCAPE = /[.*+?^${}()|[\]\\]/g;
  ESCALATION_BANNER = `${SHIPFLOW_CONTRACT.markers.escalationBannerHeading} — the loop is parked here until you reply.`;
});

// src/config.ts
import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { createHash } from "node:crypto";
function baseConfigDir() {
  return process.env.SHIPFLOW_CONFIG_DIR || DEFAULT_BASE;
}
function activeProfile() {
  return (process.env.SHIPFLOW_PROFILE ?? "").trim();
}
function configDir() {
  const profile = activeProfile();
  return profile ? join(baseConfigDir(), "profiles", profile) : baseConfigDir();
}
function listProfiles() {
  try {
    return readdirSync(join(baseConfigDir(), "profiles"), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  } catch {
    return [];
  }
}
function credentialsForProfile(name) {
  const dir = name ? join(baseConfigDir(), "profiles", name) : baseConfigDir();
  return readJsonOr(join(dir, "credentials.json"), null);
}
function ensureDir() {
  const dir = configDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 448 });
  }
}
function readJsonOr(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return fallback;
  }
}
function writeJson(path, value) {
  ensureDir();
  writeFileSync(path, JSON.stringify(value, null, 2) + `
`, {
    encoding: "utf-8",
    mode: 384
  });
}
function refreshOpts(creds) {
  return {
    refreshToken: creds.refreshToken,
    onRefreshed: (t) => saveCredentials({ ...creds, jwt: t.token, refreshToken: t.refreshToken, expiresAt: t.expiresAt })
  };
}
function projectCacheKeyForRepoPath(absRepoRoot) {
  return createHash("sha256").update(absRepoRoot).digest("hex").slice(0, 16);
}
function parseBool(v) {
  if (v == null)
    return false;
  return ["true", "1", "on", "yes"].includes(v.trim().toLowerCase());
}
function resolveAutoIssue() {
  if (process.env.SHIPFLOW_AUTO_ISSUE != null)
    return parseBool(process.env.SHIPFLOW_AUTO_ISSUE);
  return loadConfig().autoIssue === true;
}
function resolveLiveReload() {
  const env = process.env.SHIPFLOW_LIVE_RELOAD;
  if (env != null && env !== "")
    return parseBool(env);
  return loadConfig().liveReload;
}
function parseIntOr(v, fallback) {
  if (typeof v === "number")
    return Number.isFinite(v) && v >= 0 ? v : fallback;
  if (v == null || v.trim() === "")
    return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}
function parseBoolStrict(key, v) {
  const s = (v ?? "").trim().toLowerCase();
  if (BOOL_TRUE_WORDS.includes(s))
    return true;
  if (BOOL_FALSE_WORDS.includes(s))
    return false;
  throw new Error(`${key} must be one of: ${[...BOOL_TRUE_WORDS, ...BOOL_FALSE_WORDS].join(", ")} (got: ${v})`);
}
function parseIntStrict(key, v) {
  const s = (v ?? "").trim();
  if (!/^\d+$/.test(s) || !Number.isSafeInteger(Number(s))) {
    throw new Error(`${key} must be a non-negative whole number (got: ${v})`);
  }
  return Number(s);
}
function resolveRequireCi() {
  const env = process.env.SHIPFLOW_REQUIRE_CI;
  if (env != null && env !== "")
    return parseBool(env);
  const c = loadConfig().requireCi;
  return c === undefined ? true : c;
}
function resolveMergePolicy() {
  const env = process.env.SHIPFLOW_MERGE_POLICY;
  const raw = env != null && env !== "" ? env : loadConfig().mergePolicy;
  return raw && MERGE_POLICIES.includes(raw) ? raw : "manual";
}
function resolveMaxFixAttempts() {
  const env = process.env.SHIPFLOW_MAX_FIX_ATTEMPTS;
  if (env != null && env !== "")
    return parseIntOr(env, 3);
  return parseIntOr(loadConfig().maxFixAttempts, 3);
}
function resolveWipLimit() {
  const env = process.env.SHIPFLOW_WIP_LIMIT;
  if (env != null && env !== "")
    return parseIntOr(env, 10);
  return parseIntOr(loadConfig().wipLimit, 10);
}
function resolveStalePrHours() {
  const env = process.env.SHIPFLOW_STALE_PR_HOURS;
  if (env != null && env !== "")
    return parseIntOr(env, 48);
  return parseIntOr(loadConfig().stalePrHours, 48);
}
function resolveBugHunt() {
  const env = process.env.SHIPFLOW_BUG_HUNT;
  if (env != null && env !== "")
    return parseBool(env);
  const c = loadConfig().bugHunt;
  return c === undefined ? true : c;
}
function resolveBugHuntCap() {
  const env = process.env.SHIPFLOW_BUG_HUNT_CAP;
  if (env != null && env !== "")
    return parseIntOr(env, 5);
  return parseIntOr(loadConfig().bugHuntCap, 5);
}
function resolveRequireReview() {
  const env = process.env.SHIPFLOW_REQUIRE_REVIEW;
  if (env != null && env !== "")
    return parseBool(env);
  const c = loadConfig().requireReview;
  return c === undefined ? true : c;
}
function resolvePickupScope() {
  const env = process.env.SHIPFLOW_PICKUP_SCOPE;
  const raw = env != null && env.trim() !== "" ? env.trim() : loadConfig().pickupScope ?? "assigned";
  return PICKUP_SCOPES.includes(raw) ? raw : "assigned";
}
function resolveIntentGateMode() {
  const env = process.env.SHIPFLOW_INTENT_GATE;
  const raw = env != null && env.trim() !== "" ? env.trim() : loadConfig().intentGate ?? "strict";
  return INTENT_GATE_MODES.includes(raw) ? raw : "strict";
}
function resolveConflictSweep() {
  const env = process.env.SHIPFLOW_CONFLICT_SWEEP;
  if (env != null && env !== "")
    return parseBool(env);
  return loadConfig().conflictSweep === true;
}
function resolveIntakeApproval() {
  const raw = (process.env.SHIPFLOW_INTAKE_APPROVAL ?? loadConfig().intakeApproval ?? "code-org").trim().toLowerCase();
  return INTAKE_APPROVAL_MODES.includes(raw) ? raw : "code-org";
}
function resolveSignoffOwner() {
  const env = process.env.SHIPFLOW_SIGNOFF_OWNER;
  const raw = env != null && env.trim() !== "" ? env : loadConfig().signoffOwner ?? "";
  return normalizeOwner(raw);
}
function resolveLoopWorkerModel() {
  const env = process.env.SHIPFLOW_LOOP_WORKER_MODEL?.trim();
  if (env)
    return env;
  return loadConfig().loopWorkerModel?.trim() || undefined;
}
function resolveCliDriftPollSeconds() {
  const env = process.env.SHIPFLOW_CLI_DRIFT_POLL_SECONDS;
  if (env != null && env !== "")
    return parseIntOr(env, 180);
  return parseIntOr(loadConfig().cliDriftPollSeconds, 180);
}
function isValidAppSlug(v) {
  return APP_SLUG_RE.test(normalizeBotLogin(v));
}
function resolveIntentGateAuditAuthorSlug() {
  const contractDefault = normalizeBotLogin(SHIPFLOW_CONTRACT.intentGate.auditAuthorSlug);
  const candidates = [
    ["env SHIPFLOW_APP_SLUG", () => process.env.SHIPFLOW_APP_SLUG],
    ["env GITHUB_APP_SLUG", () => process.env.GITHUB_APP_SLUG],
    ["config app-slug", () => loadConfig().appSlug]
  ];
  for (const [source, read] of candidates) {
    const raw = read();
    const slug = normalizeBotLogin(raw);
    if (slug === "")
      continue;
    if (!APP_SLUG_RE.test(slug)) {
      return { slug: contractDefault, source: "contract default", rejected: `${source}=${JSON.stringify(raw)}` };
    }
    return { slug, source };
  }
  return { slug: contractDefault, source: "contract default" };
}
function resolveApiUrl(flagUrl) {
  return flagUrl || process.env.SHIPFLOW_API_URL || loadConfig().apiUrl || "http://localhost:8080";
}
function resolveAuthToken() {
  const creds = loadCredentials();
  if (creds?.jwt)
    return { token: creds.jwt, kind: "jwt" };
  const k = process.env.SHIPFLOW_API_KEY || loadConfig().apiKey;
  return k ? { token: k, kind: "apiKey" } : null;
}
function resolveApiKey() {
  const a = resolveAuthToken();
  return a?.token;
}
var INTAKE_APPROVAL_MODES, DEFAULT_BASE, configFile = () => join(configDir(), "config.json"), credsFile = () => join(configDir(), "credentials.json"), projectsFile = () => join(configDir(), "projects.json"), MERGE_POLICIES, PICKUP_SCOPES, INTENT_GATE_MODES, loadConfig = () => readJsonOr(configFile(), {}), saveConfig = (c) => writeJson(configFile(), c), clearConfig = () => {
  try {
    unlinkSync(configFile());
  } catch {}
}, loadCredentials = () => readJsonOr(credsFile(), null), saveCredentials = (c) => writeJson(credsFile(), c), loadProjectCache = () => readJsonOr(projectsFile(), {}), saveProjectCache = (c) => writeJson(projectsFile(), c), BOOL_TRUE_WORDS, BOOL_FALSE_WORDS, APP_SLUG_RE;
var init_config = __esm(() => {
  init_escalation_format();
  init_shipflow_contract_data();
  init_pr_state();
  INTAKE_APPROVAL_MODES = ["code-org", "reporter", "off"];
  DEFAULT_BASE = join(homedir(), ".config", "renaissshipflow");
  MERGE_POLICIES = ["manual", "auto-on-green", "auto-timeout"];
  PICKUP_SCOPES = ["assigned", "all"];
  INTENT_GATE_MODES = ["strict", "trusted"];
  BOOL_TRUE_WORDS = ["true", "1", "on", "yes"];
  BOOL_FALSE_WORDS = ["false", "0", "off", "no"];
  APP_SLUG_RE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/;
});

// src/client.ts
function envelopeMessage(body) {
  try {
    const parsed = JSON.parse(body);
    if (parsed && typeof parsed.error === "object" && parsed.error && typeof parsed.error.message === "string") {
      const msg = parsed.error.message.trim();
      return msg || null;
    }
  } catch {}
  return null;
}
function backoffMs(attempt) {
  return 300 * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
}

class ShipFlowClient {
  baseUrl;
  apiKey;
  refreshToken;
  onRefreshed;
  fetchImpl;
  sleep;
  constructor(opts) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.apiKey = opts.jwt || opts.apiKey;
    this.refreshToken = opts.refreshToken;
    this.onRefreshed = opts.onRefreshed;
    this.fetchImpl = opts.fetch ?? fetch;
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }
  static REQUEST_TIMEOUT_MS = 60000;
  static UPLOAD_TIMEOUT_MS = 180000;
  authedFetch(method, path, body) {
    const headers = { "Content-Type": "application/json" };
    if (this.apiKey)
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    return this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(ShipFlowClient.REQUEST_TIMEOUT_MS)
    });
  }
  async fetchWithRefresh(url, init) {
    const withAuth = () => {
      const headers = new Headers(init.headers);
      if (this.apiKey)
        headers.set("Authorization", `Bearer ${this.apiKey}`);
      return { signal: AbortSignal.timeout(ShipFlowClient.UPLOAD_TIMEOUT_MS), ...init, headers };
    };
    let res = await this.fetchImpl(url, withAuth());
    if (res.status === 401 && this.refreshToken && await this.tryRefresh()) {
      res = await this.fetchImpl(url, withAuth());
    }
    return res;
  }
  async toResult(res) {
    if (!res.ok) {
      const text2 = await res.text().catch(() => res.statusText);
      throw new ApiError(res.status, text2);
    }
    const text = await res.text();
    if (!text)
      return;
    return JSON.parse(text);
  }
  async request(method, path, body) {
    const retriable = method.toUpperCase() === "GET";
    const maxAttempts = retriable ? 3 : 1;
    let lastErr;
    for (let attempt = 0;attempt < maxAttempts; attempt++) {
      try {
        let res = await this.authedFetch(method, path, body);
        if (res.status === 401 && this.refreshToken && await this.tryRefresh()) {
          res = await this.authedFetch(method, path, body);
        }
        if (retriable && res.status >= 500 && attempt < maxAttempts - 1) {
          await this.sleep(backoffMs(attempt));
          continue;
        }
        return this.toResult(res);
      } catch (e) {
        lastErr = e;
        if (retriable && attempt < maxAttempts - 1) {
          await this.sleep(backoffMs(attempt));
          continue;
        }
        throw e;
      }
    }
    throw lastErr ?? new Error("request failed");
  }
  async tryRefresh() {
    const rt = this.refreshToken;
    if (!rt)
      return false;
    this.refreshToken = undefined;
    try {
      const res = await this.fetchImpl(`${this.baseUrl}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: rt })
      });
      if (!res.ok)
        return false;
      const data = JSON.parse(await res.text());
      this.apiKey = data.token;
      this.refreshToken = data.refreshToken;
      const expiresAt = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
      this.onRefreshed?.({ token: data.token, refreshToken: data.refreshToken, expiresAt });
      return true;
    } catch {
      return false;
    }
  }
  async listRepos(org) {
    return this.request("GET", `/api/v1/orgs/${encodeURIComponent(org)}/repos`);
  }
  async getRepo(org, repo) {
    return this.request("GET", `/api/v1/orgs/${encodeURIComponent(org)}/repos/${encodeURIComponent(repo)}`);
  }
  async updateWorkflow(org, repo, workflowType, body) {
    return this.request("PUT", `/api/v1/orgs/${encodeURIComponent(org)}/repos/${repo}/workflows/${encodeURIComponent(workflowType)}`, body);
  }
  async listActivity(org, params) {
    const qs = new URLSearchParams;
    if (params?.cursor)
      qs.set("cursor", params.cursor);
    if (params?.limit)
      qs.set("limit", String(params.limit));
    const query = qs.toString();
    return this.request("GET", `/api/v1/orgs/${encodeURIComponent(org)}/activity${query ? `?${query}` : ""}`);
  }
  async getStats(org) {
    return this.request("GET", `/api/v1/orgs/${encodeURIComponent(org)}/stats`);
  }
  async getTokenStats(org, days = 30) {
    return this.request("GET", `/api/v1/orgs/${encodeURIComponent(org)}/stats/tokens?days=${encodeURIComponent(String(days))}`);
  }
  async getOrg(org) {
    return this.request("GET", `/api/v1/orgs/${org}`);
  }
  async listChannels(org) {
    return this.request("GET", `/api/v1/orgs/${encodeURIComponent(org)}/channels`);
  }
  async addChannel(org, body) {
    return this.request("POST", `/api/v1/orgs/${encodeURIComponent(org)}/channels`, body);
  }
  async exchangeGhToken(ghToken) {
    return this.request("POST", `/api/v1/auth/token`, { access_token: ghToken });
  }
  async connectWithToken(ghToken, org) {
    return this.request("POST", `/api/v1/auth/token-connect`, { github_token: ghToken, org });
  }
  async refreshJWT(refreshToken) {
    return this.request("POST", `/api/v1/auth/refresh`, { refreshToken });
  }
  async getRepoByFullName(org, owner, repo) {
    return this.request("GET", `/api/v1/orgs/${encodeURIComponent(org)}/repos/by-fullname/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
  }
  async transferRepo(org, owner, repo, newFullName) {
    return this.request("PATCH", `/api/v1/orgs/${encodeURIComponent(org)}/repos/by-fullname/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, { newFullName });
  }
  async getTriage(org, projectId, repo, issueNumber) {
    const qs = new URLSearchParams({ repo, issue: String(issueNumber) });
    return this.request("GET", `/api/v1/orgs/${encodeURIComponent(org)}/projects/${encodeURIComponent(projectId)}/triage?${qs}`);
  }
  async matchPrecedent(org, projectId, body) {
    return this.request("POST", `/api/v1/orgs/${encodeURIComponent(org)}/projects/${encodeURIComponent(projectId)}/precedents/match`, body);
  }
  async signal(org, projectId, refKind, number, action, body) {
    await this.request("POST", `/api/v1/orgs/${encodeURIComponent(org)}/projects/${encodeURIComponent(projectId)}/${refKind}/${number}/${action}`, body);
  }
  async attachEvidence(org, projectId, number, opts) {
    const form = new FormData;
    form.set("repo", opts.repo);
    if (opts.pr)
      form.set("pr", String(opts.pr));
    if (opts.previewUrl)
      form.set("previewUrl", opts.previewUrl);
    if (opts.caption)
      form.set("caption", opts.caption);
    for (const l of opts.labels ?? [])
      form.append("pairLabel", l);
    for (const c of opts.beforeCaptions ?? [])
      form.append("beforeCaption", c);
    for (const c of opts.afterCaptions ?? [])
      form.append("afterCaption", c);
    for (const c of opts.actualCaptions ?? [])
      form.append("actualCaption", c);
    for (const c of opts.imageCaptions ?? [])
      form.append("imageCaption", c);
    for (const tf of opts.touched ?? [])
      form.append("touched", tf);
    const appendAll = (field, imgs) => {
      for (const img of imgs ?? [])
        form.append(field, new Blob([img.data]), img.filename);
    };
    appendAll("before", opts.before);
    appendAll("after", opts.after);
    appendAll("actual", opts.actual);
    appendAll("images", opts.images);
    const res = await this.fetchWithRefresh(`${this.baseUrl}/api/v1/orgs/${encodeURIComponent(org)}/projects/${encodeURIComponent(projectId)}/issues/${number}/evidence`, { method: "POST", body: form });
    if (!res.ok) {
      throw new ApiError(res.status, await res.text().catch(() => res.statusText));
    }
    return res.json();
  }
  async uploadMedia(org, projectId, files) {
    const form = new FormData;
    for (const f of files)
      form.append("files", new Blob([f.data]), f.filename);
    const res = await this.fetchWithRefresh(`${this.baseUrl}/api/v1/orgs/${encodeURIComponent(org)}/projects/${encodeURIComponent(projectId)}/media`, { method: "POST", body: form });
    if (!res.ok) {
      throw new ApiError(res.status, await res.text().catch(() => res.statusText));
    }
    return res.json();
  }
  async claimIssue(org, projectId, number, body) {
    try {
      const res = await this.request("POST", `/api/v1/orgs/${encodeURIComponent(org)}/projects/${encodeURIComponent(projectId)}/issues/${number}/claim`, body);
      return res?.claim ?? null;
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        let holder;
        try {
          holder = JSON.parse(e.body).holder;
        } catch {}
        throw new ClaimConflictError(holder);
      }
      throw e;
    }
  }
  async listClaims(org, projectId) {
    const res = await this.request("GET", `/api/v1/orgs/${encodeURIComponent(org)}/projects/${encodeURIComponent(projectId)}/claims`);
    return res?.claims ?? [];
  }
  async createCapabilityRequest(org, projectId, body) {
    const res = await this.request("POST", `/api/v1/orgs/${encodeURIComponent(org)}/projects/${encodeURIComponent(projectId)}/capability-requests`, body);
    return res.capabilityRequest;
  }
  async listCapabilityRequests(org, projectId, status) {
    const qs = status ? `?status=${encodeURIComponent(status)}` : "";
    const res = await this.request("GET", `/api/v1/orgs/${encodeURIComponent(org)}/projects/${encodeURIComponent(projectId)}/capability-requests${qs}`);
    return res?.capabilityRequests ?? [];
  }
  async triggerRelease(org, projectId, body) {
    return this.request("POST", `/api/v1/orgs/${encodeURIComponent(org)}/projects/${encodeURIComponent(projectId)}/release`, body);
  }
  async triggerWorkflow(org, projectId, workflowType, inputs) {
    return this.request("POST", `/api/v1/orgs/${encodeURIComponent(org)}/projects/${encodeURIComponent(projectId)}/workflows/${encodeURIComponent(workflowType)}/trigger`, inputs);
  }
  async getExecutionResult(org, execId) {
    return this.request("GET", `/api/v1/orgs/${encodeURIComponent(org)}/executions/${encodeURIComponent(execId)}/result`);
  }
  async getProjectStatus(org, projectId) {
    return this.request("GET", `/api/v1/orgs/${encodeURIComponent(org)}/projects/${encodeURIComponent(projectId)}/status`);
  }
  async getFeatureMapping(org, projectId) {
    return this.request("GET", `/api/v1/orgs/${encodeURIComponent(org)}/projects/${encodeURIComponent(projectId)}/feature-mapping`);
  }
  async generateFeatureMapping(org, projectId) {
    return this.request("POST", `/api/v1/orgs/${encodeURIComponent(org)}/projects/${encodeURIComponent(projectId)}/feature-mapping/generate`);
  }
}
var ApiError, ClaimConflictError;
var init_client = __esm(() => {
  ApiError = class ApiError extends Error {
    status;
    body;
    constructor(status, body) {
      super(`API error ${status}: ${envelopeMessage(body) ?? body}`);
      this.status = status;
      this.body = body;
      this.name = "ApiError";
    }
  };
  ClaimConflictError = class ClaimConflictError extends Error {
    holder;
    constructor(holder) {
      super(holder ? `issue claimed by ${holder.actor}${holder.agent ? ` (${holder.agent})` : ""} until ${holder.expiresAt}` : "issue already claimed");
      this.holder = holder;
      this.name = "ClaimConflictError";
    }
  };
});

// src/prompts.ts
var exports_prompts = {};
__export(exports_prompts, {
  promptYesNo: () => promptYesNo,
  promptText: () => promptText,
  promptSelect: () => promptSelect
});
import { createInterface } from "node:readline";
function declaredHeadless() {
  const ci = (process.env.CI ?? "").toLowerCase();
  const headless = (process.env.SHIPFLOW_HEADLESS ?? "").toLowerCase();
  return ci === "1" || ci === "true" || headless === "1" || headless === "true" || (process.env.OPENCLAW_SESSION ?? "") !== "";
}
async function promptText(question, input = process.stdin, output = process.stdout) {
  if (declaredHeadless() && input.isTTY) {
    throw new UsageError(`"${question.trim().replace(/:\s*$/, "")}" needs interactive input, but this session is declared headless (CI/SHIPFLOW_HEADLESS) — ` + "pass the value as a flag (e.g. --title/--tag).");
  }
  const rl = createInterface({ input, output });
  return new Promise((res, rej) => {
    let answered = false;
    rl.question(question, (a) => {
      answered = true;
      rl.close();
      res(a.trim());
    });
    rl.once("close", () => {
      if (!answered) {
        rej(new UsageError(`"${question.trim().replace(/:\s*$/, "")}" needs input, but stdin closed without an answer — ` + "pass the value as a flag (e.g. --title/--tag) in non-interactive sessions."));
      }
    });
  });
}
async function promptSelect(question, options) {
  console.log(question);
  options.forEach((o, i) => console.log(`  ${i + 1}. ${o}`));
  const ans = await promptText(`Choice (1-${options.length}): `);
  const n = parseInt(ans, 10);
  if (Number.isNaN(n) || n < 1 || n > options.length) {
    throw new Error(`Invalid choice: ${ans}`);
  }
  return n - 1;
}
async function promptYesNo(question, def = false) {
  const ans = (await promptText(`${question} ${def ? "[Y/n]" : "[y/N]"}: `)).toLowerCase();
  if (ans === "")
    return def;
  return ans === "y" || ans === "yes";
}
var init_prompts = __esm(() => {
  init_helpers();
});

// src/project.ts
import { execSync } from "node:child_process";
import { resolve } from "node:path";
function parseGitRemote(url) {
  let m = url.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (m)
    return { owner: m[1], repo: m[2] };
  m = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  if (m)
    return { owner: m[1], repo: m[2] };
  return null;
}
function getCwdRepoRoot() {
  try {
    return execSync("git rev-parse --show-toplevel", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return null;
  }
}
function getCwdRemote() {
  try {
    const url = execSync("git remote get-url origin", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    return parseGitRemote(url);
  } catch {
    return null;
  }
}
function cwdRepoFullName() {
  const r = getCwdRemote();
  return r ? `${r.owner}/${r.repo}` : null;
}
async function resolveProject(client, creds) {
  const r = await resolveProjectDegradable(client, creds);
  if (!r.project)
    throw new Error(r.cause ?? "ShipFlow project resolution failed");
  return r.project;
}
function noAnswerStatus(status) {
  return status >= 500 || status === 408 || status === 429;
}
function isDependencyUnavailable(e) {
  return e instanceof ApiError ? noAnswerStatus(e.status) : true;
}
function flattenCause(e, max = 300) {
  const one = (e instanceof Error ? e.message : String(e)).replace(/\s+/g, " ").trim();
  return one.length > max ? `${one.slice(0, max - 1)}…` : one;
}
async function resolveProjectDegradable(client, creds) {
  const root = getCwdRepoRoot();
  if (!root) {
    throw new Error("Not in a git repository.");
  }
  const remote = getCwdRemote();
  if (!remote) {
    throw new Error("origin remote is not a github.com URL.");
  }
  const repoFullName = `${remote.owner}/${remote.repo}`;
  const cacheKey = projectCacheKeyForRepoPath(resolve(root));
  const cache = loadProjectCache();
  if (cache[cacheKey]) {
    return { repoFullName, project: { ...cache[cacheKey], repoFullName }, degraded: [], warning: null };
  }
  let lookup;
  try {
    lookup = await client.getRepoByFullName(creds.org, remote.owner, remote.repo);
  } catch (e) {
    if (!isDependencyUnavailable(e))
      throw e;
    const cause = flattenCause(e);
    return {
      repoFullName,
      project: null,
      degraded: [SHIPFLOW_API_DEP],
      warning: degradedProjectWarning(repoFullName, cause),
      cause
    };
  }
  if (!lookup.projects || lookup.projects.length === 0) {
    throw new Error(`Repo ${repoFullName} is not in any ShipFlow project. Run \`renaiss-shipflow init\`.`);
  }
  let chosen = lookup.projects[0];
  if (lookup.projects.length > 1) {
    const idx = await promptSelect(`Repo ${repoFullName} is in multiple ShipFlow projects. Pick one:`, lookup.projects.map((p) => p.name));
    chosen = lookup.projects[idx];
  }
  const entry = {
    projectId: chosen.id,
    projectName: chosen.name,
    org: creds.org,
    tenantId: creds.tenantId
  };
  cache[cacheKey] = entry;
  saveProjectCache(cache);
  return { repoFullName, project: { ...entry, repoFullName }, degraded: [], warning: null };
}
function degradedProjectWarning(repoFullName, cause) {
  return `⚠️ WARNING ${SHIPFLOW_API_DEP} unavailable — ShipFlow project resolution NOT performed; ` + `repo ${repoFullName} read from the git remote, project-scoped steps (feature map, ShipFlow signals) skipped: ${cause}`;
}
function featureMapSkippedWarning(cause) {
  return `⚠️ WARNING ${SHIPFLOW_API_DEP} feature map unavailable — per-feature evidence coverage NOT checked; ` + `packet omits the coverage lines: ${cause}`;
}
function changedFilesUnavailableWarning(cause) {
  return `⚠️ WARNING ${GITHUB_REST_DEP} unavailable — PR changed-file list NOT read; ` + `scan attestation NOT verified (expected file count undetermined): ${cause}`;
}
function featureMapNotApplicableNote(target) {
  return `NOTE per-feature evidence coverage not applicable — no ShipFlow feature map covers ${target} ` + `(cross-repo --repo target); the coverage lines are omitted by design, not by failure.`;
}
function reviewThreadsUnavailableWarning(cause) {
  return `⚠️ WARNING ${GITHUB_GRAPHQL_DEP} unavailable — PR review threads NOT read; ` + `unresolved count NOT determined (the approve precondition could not be evaluated): ${cause}`;
}
function specUnavailableWarning(issueNumber, cause) {
  return `⚠️ WARNING ${GITHUB_GRAPHQL_DEP} unavailable — issue #${issueNumber} NOT read; ` + `the acceptance brief could not be loaded (it is unavailable, NOT absent): ${cause}`;
}
function specNotReadableIssueNote(issueNumber, repo) {
  return `NOTE #${issueNumber} is not a readable issue in ${repo} — no acceptance brief to load; ` + `GitHub answered about it, so nothing went dark (the link is stale or names a PR).`;
}
function triageUnavailableWarning(cause) {
  return `⚠️ WARNING ${SHIPFLOW_API_DEP} triage unavailable — ShipFlow context and relatedFiles NOT loaded: ${cause}`;
}
var SHIPFLOW_API_DEP = "shipflow-api", GITHUB_REST_DEP = "github-rest", GITHUB_GRAPHQL_DEP = "github-graphql", TRIAGE_UNAVAILABLE_MARKER = "⚠️ triage unavailable — ShipFlow context and relatedFiles NOT loaded";
var init_project = __esm(() => {
  init_config();
  init_client();
  init_prompts();
});

// src/output.ts
function resolveFormat(flags) {
  if (flags.json)
    return "json";
  if (flags.yaml)
    return "yaml";
  return "table";
}
function printJson(data, pretty = true) {
  console.log(pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data));
}
function toYamlString(data) {
  return toYaml(data, 0);
}
function printYaml(data) {
  console.log(toYamlString(data));
}
function isPlainSafe(s) {
  if (s === "")
    return false;
  if (/^\s|\s$/.test(s))
    return false;
  if (CONTROL_CHARS.test(s))
    return false;
  if (LEADING_INDICATOR.test(s))
    return false;
  if (/:(?:\s|$)/.test(s))
    return false;
  if (/\s#/.test(s))
    return false;
  if (NUMBER_LEAD_DASHED.test(s) || DOC_MARKER.test(s))
    return false;
  return !RESOLVES_NON_STRING.test(s);
}
function isBlockSafe(s) {
  if (CONTROL_CHARS_NO_LF.test(s))
    return false;
  if (s.startsWith(`
`) || s.endsWith(`

`))
    return false;
  return s.split(`
`).every((l) => l === "" || !/^\s|\s$/.test(l));
}
function doubleQuote(s) {
  const escaped = s.replace(/[\\"\u0000-\u001f\u007f\u0085\u2028\u2029]/g, (c) => {
    const mapped = DQ_ESCAPES[c];
    if (mapped)
      return mapped;
    const code = c.charCodeAt(0);
    return code <= 255 ? `\\x${code.toString(16).padStart(2, "0")}` : `\\u${code.toString(16).padStart(4, "0")}`;
  });
  return `"${escaped}"`;
}
function yamlScalar(value, prefix, { allowBlock = true } = {}) {
  if (isPlainSafe(value))
    return value;
  if (CONTROL_CHARS_NO_LF.test(value))
    return doubleQuote(value);
  if (value.includes(`
`)) {
    if (!allowBlock || !isBlockSafe(value))
      return doubleQuote(value);
    const clip = value.endsWith(`
`);
    const body = clip ? value.slice(0, -1) : value;
    const header = clip ? "|" : "|-";
    const indented = body.split(`
`).map((l) => l === "" ? "" : prefix + "  " + l);
    return `${header}
${indented.join(`
`)}`;
  }
  return `'${value.replace(/'/g, "''")}'`;
}
function yamlKey(k) {
  return yamlScalar(k, "", { allowBlock: false });
}
function toYaml(value, indent) {
  const prefix = "  ".repeat(indent);
  if (value === null || value === undefined)
    return "null";
  if (typeof value === "string")
    return yamlScalar(value, prefix);
  if (typeof value === "number") {
    if (Number.isNaN(value))
      return ".nan";
    if (value === Infinity)
      return ".inf";
    if (value === -Infinity)
      return "-.inf";
    return String(value);
  }
  if (typeof value === "boolean")
    return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0)
      return "[]";
    return value.map((item) => {
      const inner = toYaml(item, indent + 1);
      if (typeof item === "object" && item !== null && !Array.isArray(item)) {
        const lines = inner.split(`
`);
        return `${prefix}- ${lines[0]}
${lines.slice(1).map((l) => prefix + "  " + l).join(`
`)}`;
      }
      if (Array.isArray(item) && item.length > 0) {
        const childPrefix = "  ".repeat(indent + 1);
        const compact = inner.startsWith(childPrefix) ? inner.slice(childPrefix.length) : inner;
        return `${prefix}- ${compact}`;
      }
      return `${prefix}- ${inner}`;
    }).join(`
`);
  }
  if (typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0)
      return "{}";
    return entries.map(([k, v]) => {
      const key = yamlKey(k);
      const inner = toYaml(v, indent + 1);
      if (typeof v === "object" && v !== null && !isEmptyCollection(v)) {
        return `${prefix}${key}:
${inner}`;
      }
      return `${prefix}${key}: ${inner}`;
    }).join(`
`);
  }
  return String(value);
}
function isEmptyCollection(value) {
  return Array.isArray(value) ? value.length === 0 : Object.keys(value).length === 0;
}
function printTable(headers, rows) {
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] || "").length)));
  const sep = widths.map((w) => "-".repeat(w + 2)).join("+");
  const formatRow = (row) => row.map((cell, i) => ` ${(cell || "").padEnd(widths[i])} `).join("|");
  console.log(formatRow(headers));
  console.log(sep);
  rows.forEach((row) => console.log(formatRow(row)));
}
function formatOutput(format, data, tableFormatter, { prettyJson = true } = {}) {
  switch (format) {
    case "json":
      printJson(data, prettyJson);
      break;
    case "yaml":
      printYaml(data);
      break;
    case "table":
      tableFormatter();
      break;
  }
}
function emit(opts, jsonValue, humanPrint, { pretty = false } = {}) {
  formatOutput(resolveFormat(opts), jsonValue, humanPrint, { prettyJson: pretty });
}
var RESOLVES_NON_STRING, LEADING_INDICATOR, NUMBER_LEAD_DASHED, DOC_MARKER, CONTROL_CHARS, CONTROL_CHARS_NO_LF, DQ_ESCAPES;
var init_output = __esm(() => {
  RESOLVES_NON_STRING = /^(?:~|null|true|false|yes|no|on|off|y|n|[-+]?\.(?:inf|nan)|[-+]?0[xXoObB][0-9a-fA-F_]+|[-+]?(?:\d[\d_]*(?::[0-5]?\d)+(?:\.\d*)?|(?:\d[\d_]*(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?))$/i;
  LEADING_INDICATOR = /^[-?:,[\]{}#&*!|>'"%@`]/;
  NUMBER_LEAD_DASHED = /^[+.]?\d.*-/;
  DOC_MARKER = /(?:---|\.\.\.)(?:\s|$)/;
  CONTROL_CHARS = /[\u0000-\u001f\u007f\u0085\u2028\u2029]/;
  CONTROL_CHARS_NO_LF = /[\u0000-\u0009\u000b-\u001f\u007f\u0085\u2028\u2029]/;
  DQ_ESCAPES = {
    "\\": "\\\\",
    '"': "\\\"",
    "\n": "\\n",
    "\t": "\\t",
    "\r": "\\r"
  };
});

// src/sh.ts
import { execSync as execSync2, spawnSync } from "node:child_process";
function shellQuote(s) {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}
var EXEC_TIMEOUT_MS = 120000, EXEC_MAX_BUFFER, withDefaults = (options) => ({ timeout: EXEC_TIMEOUT_MS, maxBuffer: EXEC_MAX_BUFFER, ...options }), execImpl, spawnImpl, _exec = (cmd, options) => execImpl(cmd, withDefaults(options)), _spawn = (cmd, args, options) => spawnImpl(cmd, args ?? [], withDefaults(options));
var init_sh = __esm(() => {
  EXEC_MAX_BUFFER = 16 * 1024 * 1024;
  execImpl = execSync2;
  spawnImpl = spawnSync;
});

// src/provenance.ts
function renderProvenanceMarker(surface = PROVENANCE_SURFACE_CLI) {
  const s = surface.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "") || PROVENANCE_SURFACE_CLI;
  return `${SHIPFLOW_CONTRACT.markers.by} surface=${s} -->`;
}
function stampProvenance(body, surface = PROVENANCE_SURFACE_CLI) {
  if (!body.trim() || body.includes(SHIPFLOW_CONTRACT.markers.markerPrefix))
    return body;
  return `${body.replace(/\n+$/, "")}

<sub>${SHIPFLOW_CONTRACT.markers.provenanceFooter}</sub>
${renderProvenanceMarker(surface)}`;
}
var PROVENANCE_SURFACE_CLI = "cli";
var init_provenance = __esm(() => {
  init_shipflow_contract_data();
});

// src/gh.ts
function ghInstalled() {
  try {
    _exec("command -v gh", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
function ghAuthStatus() {
  try {
    _exec("gh auth status", { stdio: "ignore" });
    return "logged-in";
  } catch {
    return "logged-out";
  }
}
function ghAuthToken() {
  return _exec("gh auth token").toString().trim();
}
function ghAuthLogin() {
  const r = _spawn("gh", ["auth", "login"], { stdio: "inherit" });
  return r.status === 0;
}
function ghIssueView(repo, number) {
  const out = _exec(`gh issue view ${number} --repo ${shellQuote(repo)} --json ${FIELDS}`).toString();
  return JSON.parse(out);
}
function classifyIssueReadFailure(e) {
  const parts = [
    e instanceof Error ? e.message : String(e),
    String(e?.stderr ?? ""),
    String(e?.stdout ?? "")
  ];
  const text = parts.join(`
`);
  return ISSUE_READ_ANSWERED_PATTERNS.some((re) => re.test(text)) ? "not-an-issue" : "unavailable";
}
function ghIssueOrPrState(repo, number) {
  try {
    const out = _exec(`gh api ${shellQuote(`repos/${repo}/issues/${number}`)} --jq .state`).toString().trim();
    return out === "open" || out === "closed" ? out : null;
  } catch {
    return null;
  }
}
function ghIssueCreate(repo, title, body, labels = []) {
  ghEnsureLabel(repo, VIA_SHIPFLOW_LABEL, undefined, "Created by ShipFlow (agent-filed, not human-filed)");
  const allLabels = labels.includes(VIA_SHIPFLOW_LABEL) ? labels : [...labels, VIA_SHIPFLOW_LABEL];
  const labelFlags = allLabels.map((l) => `--label ${shellQuote(l)}`).join(" ");
  const bodyWithMarker = body.includes(SHIPFLOW_TRIAGED_MARKER) ? body : `${body.replace(/\n+$/, "")}

<sub>\uD83E\uDD16 Filed via ShipFlow</sub>
${SHIPFLOW_TRIAGED_MARKER}`;
  const out = _exec(`gh issue create --repo ${shellQuote(repo)} --title ${shellQuote(title)} --body ${shellQuote(bodyWithMarker)} ${labelFlags}`).toString();
  const url = out.split(`
`).map((s) => s.trim()).filter(Boolean).reverse().find((l) => l.startsWith("http")) ?? out.trim();
  const number = parseInt(url.split("/").pop() || "0", 10);
  return { url, number };
}
function ghIssueEditBody(repo, number, body) {
  _exec(`gh issue edit ${number} --repo ${shellQuote(repo)} --body ${shellQuote(body)}`, { stdio: "ignore" });
}
function ghIssueAddAssignees(repo, number, logins) {
  if (!logins.length)
    return;
  const flags = logins.map((a) => `--add-assignee ${shellQuote(a)}`).join(" ");
  _exec(`gh issue edit ${number} --repo ${shellQuote(repo)} ${flags}`);
}
function ghIssueAssignees(repo, number) {
  const out = _exec(`gh issue view ${number} --repo ${shellQuote(repo)} --json assignees`).toString();
  const parsed = JSON.parse(out);
  return (parsed.assignees ?? []).map((a) => String(a.login ?? "")).filter(Boolean);
}
function assertResolvedFilter(value, flag, command) {
  if (value !== undefined && value.trim() === "") {
    throw new Error(`${command}: ${flag} resolved to an empty value — refusing to drop the filter and list the whole repo (check \`gh auth status\`)`);
  }
}
function ghIssueList(repo, state = "open", limit = 30, assignee, label) {
  assertResolvedFilter(assignee, "--assignee", "gh issue list");
  assertResolvedFilter(label, "--label", "gh issue list");
  const assigneeArg = assignee ? ` --assignee ${shellQuote(assignee)}` : "";
  const labelArg = label ? ` --label ${shellQuote(label)}` : "";
  const out = _exec(`gh issue list --repo ${shellQuote(repo)} --state ${state} --limit ${limit}${assigneeArg}${labelArg} --json ${FIELDS}`).toString();
  return JSON.parse(out);
}
function ghIssueListFiltered(repo, f = {}) {
  const parts = [
    "gh issue list",
    `--repo ${shellQuote(repo)}`,
    `--state ${shellQuote(f.state ?? "open")}`,
    `--limit ${f.limit ?? 1000}`,
    `--json ${DETAIL_FIELDS}`
  ];
  assertResolvedFilter(f.assignee, "--assignee", "gh issue list");
  for (const l of f.labels ?? [])
    parts.push(`--label ${shellQuote(l)}`);
  if (f.assignee)
    parts.push(`--assignee ${shellQuote(f.assignee)}`);
  if (f.author)
    parts.push(`--author ${shellQuote(f.author)}`);
  if (f.mention)
    parts.push(`--mention ${shellQuote(f.mention)}`);
  if (f.milestone)
    parts.push(`--milestone ${shellQuote(f.milestone)}`);
  if (f.search)
    parts.push(`--search ${shellQuote(f.search)}`);
  const out = _exec(parts.join(" ")).toString();
  return JSON.parse(out);
}
function ghPRCreate(args) {
  const parts = ["gh pr create", `--repo ${shellQuote(args.repo)}`, `--body ${shellQuote(args.body)}`];
  if (args.title)
    parts.push(`--title ${shellQuote(args.title)}`);
  if (args.base)
    parts.push(`--base ${shellQuote(args.base)}`);
  if (args.head)
    parts.push(`--head ${shellQuote(args.head)}`);
  if (args.draft)
    parts.push(`--draft`);
  const out = _exec(parts.join(" ")).toString().trim();
  const number = parseInt(out.split("/").pop() || "0", 10);
  return { url: out, number };
}
function ghRepoMergeMethods(repo) {
  try {
    const out = _exec(`gh repo view ${shellQuote(repo)} --json squashMergeAllowed,mergeCommitAllowed,rebaseMergeAllowed`).toString();
    const p = JSON.parse(out);
    return { squash: p.squashMergeAllowed !== false, merge: p.mergeCommitAllowed !== false, rebase: p.rebaseMergeAllowed !== false };
  } catch {
    return { squash: true, merge: true, rebase: true };
  }
}
function chooseMergeMethod(preferred, allowed) {
  if (allowed[preferred])
    return preferred;
  for (const m of ["squash", "merge", "rebase"]) {
    if (allowed[m])
      return m;
  }
  return preferred;
}
function ghOwnOpenPRs(repo, author) {
  const out = _exec(`gh pr list --repo ${shellQuote(repo)} --author ${shellQuote(author)} --state open --limit 100 --json number,isDraft`).toString();
  return JSON.parse(out);
}
function ghPRCheckLines(repo, number) {
  try {
    return _exec(`gh pr checks ${number} --repo ${shellQuote(repo)}`, { stdio: ["ignore", "pipe", "ignore"] }).toString().split(`
`).filter((l) => l.trim() !== "");
  } catch (e) {
    const out = e.stdout?.toString() ?? "";
    return out.split(`
`).filter((l) => l.trim() !== "");
  }
}
function ghPRMerge(repo, number, mode = "squash", deleteBranch = true) {
  const method = chooseMergeMethod(mode, ghRepoMergeMethods(repo));
  if (method !== mode)
    console.error(`ℹ️  repo disallows --${mode}; merging with --${method} (issue #494)`);
  const flags = [`--${method}`];
  if (deleteBranch)
    flags.push("--delete-branch");
  _exec(`gh pr merge ${number} --repo ${shellQuote(repo)} ${flags.join(" ")}`, { stdio: "inherit" });
  const view = _exec(`gh pr view ${number} --repo ${shellQuote(repo)} --json mergeCommit,headRefName`).toString();
  const parsed = JSON.parse(view);
  return { mergedSha: parsed.mergeCommit?.oid ?? "", headBranch: parsed.headRefName ?? "" };
}
function ghPRListMine(repo, limit = 30) {
  const out = _exec(`gh pr list --repo ${shellQuote(repo)} --author @me --state open --limit ${limit} --json ${PR_FIELDS}`).toString();
  return JSON.parse(out);
}
function ghPRListMineMerged(repo, limit = 100) {
  const out = _exec(`gh pr list --repo ${shellQuote(repo)} --author @me --state merged --limit ${limit} --json ${PR_FIELDS}`).toString();
  return JSON.parse(out);
}
function issueConnectionFilterBy(assignee, label) {
  const parts = [];
  if (assignee)
    parts.push(`assignee:${JSON.stringify(assignee)}`);
  if (label)
    parts.push(`labels:[${JSON.stringify(label)}]`);
  return parts.length ? `,filterBy:{${parts.join(",")}}` : "";
}
function ghAuthorAssociations(repo, connection, limit, filters) {
  const [owner, name] = repo.split("/");
  const assoc = new Map;
  let remaining = Math.max(0, Math.trunc(limit));
  let after;
  const filterBy = connection === "issues" ? issueConnectionFilterBy(filters?.assignee, filters?.label) : "";
  while (remaining > 0) {
    const page = Math.min(remaining, GH_GRAPHQL_PAGE_MAX);
    const q = "query($o:String!,$r:String!,$n:Int!,$c:String){repository(owner:$o,name:$r){" + `${connection}(states:OPEN,first:$n,after:$c,orderBy:{field:CREATED_AT,direction:DESC}${filterBy})` + "{pageInfo{hasNextPage endCursor}nodes{number authorAssociation}}}}";
    const cmd = `gh api graphql -f query=${shellQuote(q)} -f o=${shellQuote(owner)} -f r=${shellQuote(name)} -F n=${page}` + (after ? ` -f c=${shellQuote(after)}` : "");
    const payload = JSON.parse(_exec(cmd).toString());
    if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
      throw new Error(`GraphQL error: ${payload.errors.map((e) => e?.message ?? "unknown").join("; ")}`);
    }
    const conn = payload?.data?.repository?.[connection];
    if (!conn)
      throw new Error(`GraphQL returned no ${connection} connection for ${repo} (repository null or unreadable)`);
    const nodes = conn.nodes ?? [];
    for (const n of nodes) {
      if (typeof n.number === "number")
        assoc.set(n.number, String(n.authorAssociation ?? ""));
    }
    remaining -= nodes.length;
    after = conn.pageInfo?.endCursor ?? undefined;
    if (!conn.pageInfo?.hasNextPage || !after || nodes.length === 0)
      break;
  }
  return assoc;
}
function ghPRAuthorAssociations(repo, limit = 50) {
  return ghAuthorAssociations(repo, "pullRequests", limit);
}
function ghIssueAuthorAssociations(repo, limit = 200, assignee, label) {
  assertResolvedFilter(assignee, "--assignee", "gh issue list");
  assertResolvedFilter(label, "--label", "gh issue list");
  return ghAuthorAssociations(repo, "issues", limit, { assignee, label });
}
function ghIssueAuthorAssociation(repo, number) {
  const [owner, name] = repo.split("/");
  const q = "query($o:String!,$r:String!,$n:Int!){repository(owner:$o,name:$r){issue(number:$n){authorAssociation}}}";
  const payload = JSON.parse(_exec(`gh api graphql -f query=${shellQuote(q)} -f o=${shellQuote(owner)} -f r=${shellQuote(name)} -F n=${number}`).toString());
  if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
    throw new Error(`GraphQL error: ${payload.errors.map((e) => e?.message ?? "unknown").join("; ")}`);
  }
  const issue = payload?.data?.repository?.issue;
  if (!issue)
    throw new Error(`GraphQL returned no issue ${repo}#${number} (repository null or unreadable)`);
  return String(issue.authorAssociation ?? "");
}
function ghIssueListWithAssociations(repo, limit = 200, assignee, label) {
  const issues = ghIssueList(repo, "open", limit, assignee, label);
  const listFilterSet = Boolean(assignee || label);
  let assoc;
  try {
    assoc = ghIssueAuthorAssociations(repo, limit, assignee, label);
  } catch (e) {
    console.error(`⚠️  issue authorAssociation lookup failed (${String(e.message ?? e).split(`
`)[0]}) — ` + `all ${issues.length} open issue(s) report as association-unknown and stay gated for THIS pass only; ` + `no ${SHIPFLOW_CONTRACT.labels.names.needsReporterApproval} label will be written.`);
    for (const i of issues)
      i.associationLookupFailed = true;
    return issues;
  }
  let uncovered = 0;
  const toFill = [];
  for (const i of issues) {
    const a = assoc.get(i.number);
    if (a === undefined) {
      if (listFilterSet) {
        toFill.push(i);
        continue;
      }
      i.associationLookupFailed = true;
      uncovered++;
      continue;
    }
    i.authorAssociation = a;
  }
  for (const i of toFill) {
    try {
      i.authorAssociation = ghIssueAuthorAssociation(repo, i.number);
    } catch {
      i.associationLookupFailed = true;
      uncovered++;
    }
  }
  if (uncovered > 0) {
    console.error(`⚠️  ${uncovered} of ${issues.length} open issue(s) fell outside the authorAssociation window — ` + "they report as association-unknown and stay gated for THIS pass only; no label will be written.");
  }
  return issues;
}
function ghPRListAll(repo, limit = 50) {
  const out = _exec(`gh pr list --repo ${shellQuote(repo)} --state open --limit ${limit} --json ${PR_FIELDS}`).toString();
  const prs = JSON.parse(out);
  let assoc;
  try {
    assoc = ghPRAuthorAssociations(repo, limit);
  } catch (e) {
    console.error(`⚠️  authorAssociation lookup failed (${String(e.message ?? e).split(`
`)[0]}) — ` + `every foreign head reports as association-unknown and stays untrusted this tick.`);
    return prs.map((p) => ({ ...p, associationLookupFailed: true }));
  }
  return prs.map((p) => ({ ...p, authorAssociation: assoc.get(p.number) }));
}
function ghUser() {
  const out = _exec("gh api user").toString();
  const u = JSON.parse(out);
  return { login: String(u.login ?? ""), id: Number(u.id ?? 0), name: String(u.name ?? "") || String(u.login ?? ""), email: String(u.email ?? "") };
}
function ghMatchedEmail(u) {
  return u.email || `${u.id}+${u.login}@users.noreply.github.com`;
}
function ghCurrentLogin() {
  try {
    return _exec("gh api user --jq .login").toString().trim();
  } catch {
    return "";
  }
}
function ghIssueListByLabel(repo, label, limit = 30) {
  const out = _exec(`gh issue list --repo ${shellQuote(repo)} --state open --label ${shellQuote(label)} --limit ${limit} --json ${LIST_BY_LABEL_FIELDS}`).toString();
  return JSON.parse(out);
}
function ghOpenPRClosingIssues(repo) {
  const out = _exec(`gh pr list --repo ${shellQuote(repo)} --state open --limit 100 --json body,closingIssuesReferences`).toString();
  const prs = JSON.parse(out);
  return new Set(prs.flatMap((p) => linkedIssueNumbers(p)));
}
function ghMergedPartOfParents(repo) {
  try {
    const out = _exec(`gh pr list --repo ${shellQuote(repo)} --state merged --limit 200 --json body`).toString();
    const prs = JSON.parse(out);
    const parents = new Set;
    for (const pr of prs) {
      for (const n of partOfIssueNumbers(pr.body))
        parents.add(n);
    }
    return parents;
  } catch {
    return new Set;
  }
}
function ghPRDiffText(repo, number) {
  return _exec(`gh pr diff ${number} --repo ${shellQuote(repo)}`, { maxBuffer: 32 * 1024 * 1024 }).toString();
}
function ghPRChangedFiles(repo, number) {
  const out = _exec(`gh api --paginate repos/${shellQuote(repo)}/pulls/${number}/files --jq ${shellQuote(".[].filename")}`, { maxBuffer: 32 * 1024 * 1024 }).toString();
  return out.split(`
`).map((l) => l.trim()).filter(Boolean);
}
function ghPRMergedByHead(repo, branch) {
  const out = _exec(`gh pr list --repo ${shellQuote(repo)} --head ${shellQuote(branch)} --state merged --limit 1 --json number,headRefOid`).toString();
  const rows = JSON.parse(out);
  const pr = rows[0];
  return pr && typeof pr.number === "number" && typeof pr.headRefOid === "string" ? { number: pr.number, headRefOid: pr.headRefOid } : null;
}
function ghCompareHead(repo, pr) {
  const baseOwner = repo.split("/")[0] ?? "";
  const headOwner = pr.headRepositoryOwner?.login;
  const crossRepo = pr.isCrossRepository === true || headOwner != null && headOwner.toLowerCase() !== baseOwner.toLowerCase();
  if (!crossRepo)
    return pr.headRefName;
  return headOwner ? `${headOwner}:${pr.headRefName}` : null;
}
function ghPRFreshness(repo, pr) {
  const base = pr.baseRefName;
  if (!base)
    return { behindBy: null, unresolvable: true };
  const head = ghCompareHead(repo, pr);
  if (head === null)
    return { behindBy: null, unresolvable: true };
  try {
    const out = _exec(`gh api repos/${shellQuote(repo)}/compare/${shellQuote(base)}...${shellQuote(head)} -q .behind_by`, { stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
    const n = parseInt(out, 10);
    return Number.isNaN(n) ? { behindBy: null } : { behindBy: n };
  } catch (e) {
    const err = e;
    const detail = `${String(err.stderr ?? "")}
${err.message ?? ""}`;
    return /HTTP 404|\bNot Found\b/i.test(detail) ? { behindBy: null, unresolvable: true } : { behindBy: null };
  }
}
function ghPRLastHeadAt(repo, number) {
  const [owner, name] = repo.split("/");
  const q = "query($o:String!,$r:String!,$n:Int!){repository(owner:$o,name:$r){pullRequest(number:$n){" + "commits(last:1){nodes{commit{committedDate}}}}}}";
  const payload = JSON.parse(_exec(`gh api graphql -f query=${shellQuote(q)} -f o=${shellQuote(owner)} -f r=${shellQuote(name)} -F n=${number}`).toString());
  if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
    throw new Error(`GraphQL error: ${payload.errors.map((e) => e?.message ?? "unknown").join("; ")}`);
  }
  const date = payload?.data?.repository?.pullRequest?.commits?.nodes?.[0]?.commit?.committedDate;
  if (typeof date !== "string" || date.trim() === "" || Number.isNaN(Date.parse(date))) {
    throw new Error(`GraphQL returned no last-head committedDate for ${repo}#${number}`);
  }
  return date;
}
function ghPRView(repo, number) {
  const out = _exec(`gh pr view ${number} --repo ${shellQuote(repo)} --json ${PR_FIELDS}`).toString();
  return JSON.parse(out);
}
function ghPRHeadOid(repo, number) {
  try {
    const out = _exec(`gh pr view ${number} --repo ${shellQuote(repo)} --json headRefOid`).toString();
    const parsed = JSON.parse(out);
    return typeof parsed.headRefOid === "string" && parsed.headRefOid.trim() !== "" ? parsed.headRefOid.trim() : null;
  } catch {
    return null;
  }
}
function labelColorFor(name) {
  if (Object.prototype.hasOwnProperty.call(LABEL_COLORS, name))
    return LABEL_COLORS[name];
  for (const [prefix, c] of Object.entries(LABEL_PREFIX_COLORS)) {
    if (name.startsWith(prefix))
      return c;
  }
  return;
}
function ghEnsureLabel(repo, name, color, description = "") {
  const resolved = color ?? labelColorFor(name);
  const force = resolved !== undefined;
  try {
    _exec(`gh label create ${shellQuote(name)} --repo ${shellQuote(repo)} --color ${shellQuote(resolved ?? "ededed")} --description ${shellQuote(description)}${force ? " --force" : ""}`, { stdio: "ignore" });
  } catch {}
}
function ghIssueAddLabels(repo, number, labels) {
  if (!labels.length)
    return;
  const flags = labels.map((l) => `--add-label ${shellQuote(l)}`).join(" ");
  _exec(`gh issue edit ${number} --repo ${shellQuote(repo)} ${flags}`, { stdio: "ignore" });
}
function ghIssueRemoveLabel(repo, number, label) {
  try {
    _exec(`gh issue edit ${number} --repo ${shellQuote(repo)} --remove-label ${shellQuote(label)}`, { stdio: "ignore" });
  } catch {}
}
function ghIssueComment(repo, number, body) {
  _exec(`gh issue comment ${number} --repo ${shellQuote(repo)} --body ${shellQuote(stampProvenance(body))}`, { stdio: "ignore" });
}
function ghLabelRemovals(repo, number, label) {
  return ghIssueTimelineSignals(repo, number, label).removals;
}
function ghIssueTimelineSignals(repo, number, label) {
  const signals = { removals: [], renamedAt: [] };
  try {
    const [owner, name] = repo.split("/");
    const path = `repos/${owner}/${name}/issues/${number}/timeline`;
    const q = '.[] | select(.event=="unlabeled" or .event=="renamed") | [.event, (.label.name // ""), (.actor.login // ""), (.actor.type // ""), (.created_at // "")] | @tsv';
    const out = _exec(`gh api ${shellQuote(path)} --paginate -q ${shellQuote(q)}`).toString();
    for (const line of out.split(`
`)) {
      const c = line.split("\t");
      const event = (c[0] ?? "").trim();
      if (event === "renamed") {
        signals.renamedAt.push((c[4] ?? "").trim());
        continue;
      }
      if (event !== "unlabeled" || c[1] !== label)
        continue;
      const actor = (c[2] ?? "").trim();
      const type = (c[3] ?? "").trim().toLowerCase();
      signals.removals.push({
        actor,
        actorIsBot: type === "bot" || actor.endsWith("[bot]"),
        actorKnown: actor !== "",
        createdAt: (c[4] ?? "").trim()
      });
    }
    return signals;
  } catch {
    return { removals: [], renamedAt: [] };
  }
}
function ghIntentGateAuditCandidates(repo, number) {
  try {
    const [owner, name] = repo.split("/");
    const path = `repos/${owner}/${name}/issues/${number}/comments`;
    const q = '.[] | {body: (.body // ""), authorLogin: (.user.login // ""), ' + 'authorAssociation: (.author_association // ""), ' + 'authorIsBot: ((.user.type // "") == "Bot"), ' + 'createdAt: (.created_at // "")} | @json';
    const out = _exec(`gh api ${shellQuote(path)} --paginate -q ${shellQuote(q)}`).toString();
    return out.split(`
`).map((l) => l.trim()).filter((l) => l !== "").map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}
function ghIssueLastEditedAt(repo, number) {
  const [owner, name] = repo.split("/");
  const q = "query($o:String!,$r:String!,$n:Int!){repository(owner:$o,name:$r){issue(number:$n){lastEditedAt}}}";
  const payload = JSON.parse(_exec(`gh api graphql -f query=${shellQuote(q)} -f o=${shellQuote(owner)} -f r=${shellQuote(name)} -F n=${number}`).toString());
  if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
    throw new Error(`GraphQL error: ${payload.errors.map((e) => e?.message ?? "unknown").join("; ")}`);
  }
  const issue = payload?.data?.repository?.issue;
  if (!issue)
    throw new Error(`GraphQL returned no issue ${repo}#${number} (repository null or unreadable)`);
  return issue.lastEditedAt ? String(issue.lastEditedAt) : null;
}
function ghIntentGateAuditCount(repo, number) {
  try {
    const trusted = resolveIntentGateAuditAuthorSlug();
    const candidates = ghIntentGateAuditCandidates(repo, number);
    const accepted = candidates.filter((c) => isIntentGateAuditComment(c, trusted.slug));
    for (const c of candidates) {
      if (c.authorIsBot === true && intentGateAuditLineAnchored(c.body) && !isIntentGateAuditComment(c, trusted.slug)) {
        console.warn(`⚠️  intent-gate audit comment from bot '${c.authorLogin}' ignored — ` + `only '${trusted.slug}' is trusted to record a clearance ` + `(source: ${trusted.source}` + (trusted.rejected ? `; refused malformed ${trusted.rejected}` : "") + `; contract default intentGate.auditAuthorSlug=` + `'${SHIPFLOW_CONTRACT.intentGate.auditAuthorSlug}'). ` + `If that bot IS your deployment's ShipFlow App, set GITHUB_APP_SLUG ` + `(or \`renaiss-shipflow config set app-slug <slug>\`) to its slug.`);
      }
    }
    return accepted.length;
  } catch {
    return 0;
  }
}
function ghIntentGateLastClearedAt(repo, number) {
  try {
    const trusted = resolveIntentGateAuditAuthorSlug();
    let bestMs = -Infinity;
    let best;
    for (const c of ghIntentGateAuditCandidates(repo, number)) {
      if (!isIntentGateAuditComment(c, trusted.slug))
        continue;
      const t = Date.parse(c.createdAt ?? "");
      if (Number.isNaN(t) || t <= bestMs)
        continue;
      bestMs = t;
      best = c.createdAt;
    }
    return best;
  } catch {
    return;
  }
}
function ghIntentGateClearance(repo, number, label) {
  return {
    auditComments: ghIntentGateAuditCount(repo, number),
    removals: ghLabelRemovals(repo, number, label)
  };
}
function ghIntakeGateAuditCount(repo, number) {
  try {
    const trusted = resolveIntentGateAuditAuthorSlug();
    return ghIntentGateAuditCandidates(repo, number).filter((c) => isIntakeGateAuditComment(c, trusted.slug)).length;
  } catch {
    return 0;
  }
}
function ghIssueAuthor(repo, number) {
  try {
    const out = _exec(`gh issue view ${number} --repo ${shellQuote(repo)} --json author`).toString();
    return JSON.parse(out)?.author?.login || null;
  } catch {
    return null;
  }
}
function ghIssueComments(repo, number) {
  const out = _exec(`gh issue view ${number} --repo ${shellQuote(repo)} --json comments`).toString();
  const nodes = JSON.parse(out)?.comments ?? [];
  return nodes.map((c) => ({
    id: String(c.id ?? ""),
    body: String(c.body ?? ""),
    viewerDidAuthor: !!c.viewerDidAuthor,
    authorLogin: String(c.author?.login ?? ""),
    authorAssociation: String(c.authorAssociation ?? "")
  }));
}
function ghUpdateIssueComment(commentId, body) {
  const m = "mutation($id:ID!,$b:String!){updateIssueComment(input:{id:$id,body:$b}){issueComment{id}}}";
  _exec(`gh api graphql -f query=${shellQuote(m)} -f id=${shellQuote(commentId)} -f b=${shellQuote(stampProvenance(body))}`, { stdio: "ignore" });
}
function ghCreateReview(repo, number, payload) {
  const [owner, name] = repo.split("/");
  const stamped = {
    ...payload,
    body: stampProvenance(payload.body),
    comments: payload.comments.map((c) => ({ ...c, body: stampProvenance(c.body) }))
  };
  _exec(`gh api repos/${shellQuote(owner)}/${shellQuote(name)}/pulls/${number}/reviews --method POST --input -`, { input: JSON.stringify(stamped), stdio: ["pipe", "ignore", "pipe"] });
}
function ghReviewThreads(repo, number) {
  const [owner, name] = repo.split("/");
  const q = "query($o:String!,$r:String!,$n:Int!){repository(owner:$o,name:$r){pullRequest(number:$n){" + "reviewThreads(first:100){nodes{id isResolved comments(first:1){nodes{path line author{login} body createdAt}}}}}}}";
  const payload = JSON.parse(_exec(`gh api graphql -f query=${shellQuote(q)} -f o=${shellQuote(owner)} -f r=${shellQuote(name)} -F n=${number}`).toString());
  if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
    throw new Error(`GraphQL error: ${payload.errors.map((e) => e?.message ?? "unknown").join("; ")}`);
  }
  const pr = payload?.data?.repository?.pullRequest;
  if (!pr)
    throw new Error(`GraphQL returned no pull request ${repo}#${number} (repository null or unreadable)`);
  const nodes = pr.reviewThreads?.nodes ?? [];
  return nodes.map((t) => {
    const c = t.comments?.nodes?.[0] ?? {};
    const submittedAt = typeof c.createdAt === "string" && c.createdAt.trim() !== "" ? String(c.createdAt) : undefined;
    return {
      id: String(t.id),
      isResolved: !!t.isResolved,
      path: c.path ?? "",
      line: c.line ?? null,
      author: c.author?.login ?? "",
      body: (c.body ?? "").slice(0, 240),
      ...submittedAt ? { submittedAt } : {}
    };
  });
}
function reviewThreadCensus(threads, me) {
  const unresolved = threads.filter((t) => !t.isResolved);
  const login = me.trim();
  const external = unresolved.filter((t) => !login || t.author !== login);
  return {
    unresolved,
    unresolvedThreads: unresolved.length,
    externalUnresolved: external.length,
    blocking: external.length > 0
  };
}
function ghResolveReviewThread(threadId) {
  const m = "mutation($t:ID!){resolveReviewThread(input:{threadId:$t}){thread{isResolved}}}";
  try {
    _exec(`gh api graphql -f query=${shellQuote(m)} -f t=${shellQuote(threadId)}`, { stdio: "ignore" });
  } catch {}
}
var FIELDS = "number,title,body,state,labels,assignees,url,createdAt", ISSUE_READ_ANSWERED_PATTERNS, SHIPFLOW_TRIAGED_MARKER, VIA_SHIPFLOW_LABEL, DETAIL_FIELDS, PR_FIELDS = "number,title,body,headRefName,baseRefName,url,isDraft,reviewDecision,mergeable,labels,reviews,comments,statusCheckRollup,closingIssuesReferences,createdAt,updatedAt,author,isCrossRepository,headRepositoryOwner,headRefOid,mergedAt", GH_GRAPHQL_PAGE_MAX = 100, LIST_BY_LABEL_FIELDS, LABEL_COLORS, LABEL_PREFIX_COLORS;
var init_gh = __esm(() => {
  init_sh();
  init_shipflow_contract_data();
  init_provenance();
  init_pr_state();
  init_config();
  init_sh();
  ISSUE_READ_ANSWERED_PATTERNS = [
    /could not resolve to an issue/i,
    /could not resolve to a pullrequest/i,
    /could not resolve to an issue or pull request/i,
    /\bno issue found\b/i,
    /\b(?:http )?404\b(?=[^\n]*\/issues\/\d+)/i
  ];
  SHIPFLOW_TRIAGED_MARKER = SHIPFLOW_CONTRACT.markers.triaged;
  VIA_SHIPFLOW_LABEL = SHIPFLOW_CONTRACT.labels.names.viaShipflow;
  DETAIL_FIELDS = `${FIELDS},author,milestone,updatedAt,closedAt`;
  LIST_BY_LABEL_FIELDS = `${FIELDS},comments`;
  LABEL_COLORS = SHIPFLOW_CONTRACT.labels.colors;
  LABEL_PREFIX_COLORS = SHIPFLOW_CONTRACT.labels.prefixColors;
});

// src/commands/helpers.ts
function buildClientAuth(auth, creds) {
  if (auth.kind === "jwt" && creds)
    return { jwt: auth.token, ...refreshOpts(creds) };
  return { apiKey: auth.token };
}
function getClient(cmd) {
  const opts = cmd.optsWithGlobals();
  const auth = resolveAuthToken();
  if (!auth) {
    console.error("Not signed in. Run: renaiss-shipflow login (or set SHIPFLOW_API_KEY).");
    process.exit(1);
  }
  return new ShipFlowClient({ baseUrl: resolveApiUrl(opts.apiUrl), ...buildClientAuth(auth, loadCredentials()) });
}
function loadJwtCtx(program2) {
  const auth = resolveAuthToken();
  const creds = loadCredentials();
  if (!auth || !creds) {
    console.error("Not signed in. Run: renaiss-shipflow login");
    process.exit(1);
  }
  const client = new ShipFlowClient({ baseUrl: resolveApiUrl(program2.optsWithGlobals().apiUrl), jwt: auth.token, ...refreshOpts(creds) });
  return { auth, creds, client };
}
async function loadCtx(program2) {
  const { auth, creds, client } = loadJwtCtx(program2);
  const project = await resolveProject(client, creds);
  return { auth, creds, client, project };
}
function repoOverrideBypassesProject(repoOverride, cwdRepo) {
  const target = repoOverride?.trim();
  if (!target)
    return false;
  return target.toLowerCase() !== (cwdRepo ?? "").toLowerCase();
}
function repoOverrideMakesProjectNotApplicable(repoOverride, cwdRepo) {
  return cwdRepo !== null && repoOverrideBypassesProject(repoOverride, cwdRepo);
}
async function loadGhCtx(program2, repoOverride) {
  const { auth, creds, client } = loadJwtCtx(program2);
  const cwdRepo = cwdRepoFullName();
  if (repoOverrideBypassesProject(repoOverride, cwdRepo)) {
    return {
      auth,
      creds,
      client,
      project: { repoFullName: repoOverride.trim(), projectId: null, projectName: null },
      degraded: [],
      projectNotApplicable: repoOverrideMakesProjectNotApplicable(repoOverride, cwdRepo)
    };
  }
  const r = await resolveProjectDegradable(client, creds);
  if (r.warning)
    console.warn(r.warning);
  return {
    auth,
    creds,
    client,
    project: {
      repoFullName: r.repoFullName,
      projectId: r.project?.projectId ?? null,
      projectName: r.project?.projectName ?? null
    },
    degraded: r.degraded,
    projectNotApplicable: false
  };
}
function degradedField(ctx) {
  return ctx.degraded.length ? { degraded: ctx.degraded } : {};
}
async function signalBestEffort(ctx, refKind, n, action, body, label) {
  try {
    await ctx.client.signal(ctx.creds.org, ctx.project.projectId, refKind, n, action, body);
    return true;
  } catch (e) {
    if (label)
      console.warn(`${label}: ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}
function getApiCtx(cmd) {
  return { client: getClient(cmd), org: getOrg(cmd), format: getFormat(cmd) };
}
function resolveTarget(ctx, numberStr, opts) {
  return { number: parseInt(numberStr, 10), repo: opts.repo ?? ctx.project.repoFullName };
}
function getOrg(cmd) {
  return cmd.optsWithGlobals().org || "default";
}
function getFormat(cmd) {
  return resolveFormat(cmd.opts());
}
function resolveMeLogin(context) {
  const me = ghCurrentLogin();
  if (!me) {
    throw new UsageError(`${context}: gh login unresolved (\`gh api user\` failed — auth/network?) — refusing an unfiltered, repo-wide fallback; check \`gh auth status\``);
  }
  return me;
}
function runAction(fn) {
  return async (...args) => {
    try {
      await fn(...args);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const cmd = args[args.length - 1];
      const opts = typeof cmd?.optsWithGlobals === "function" ? cmd.optsWithGlobals() : typeof cmd?.opts === "function" ? cmd.opts() : {};
      if (opts?.json)
        console.log(JSON.stringify({ error: message }));
      else
        console.error(`Error: ${message}`);
      process.exit(err instanceof UsageError ? 1 : UNEXPECTED_EXIT_CODE);
    }
  };
}
var UNEXPECTED_EXIT_CODE = 10, UsageError;
var init_helpers = __esm(() => {
  init_client();
  init_config();
  init_project();
  init_output();
  init_gh();
  init_output();
  UsageError = class UsageError extends Error {
  };
});

// src/index.ts
import { createRequire as createRequire3 } from "node:module";

// ../../node_modules/commander/esm.mjs
var import__ = __toESM(require_commander(), 1);
var {
  program,
  createCommand,
  createArgument,
  createOption,
  CommanderError,
  InvalidArgumentError,
  InvalidOptionArgumentError,
  Command,
  Argument,
  Option,
  Help
} = import__.default;

// src/commands/auth.ts
init_config();
init_helpers();
function registerAuthCommands(program2) {
  const auth = program2.command("auth").description("Manage authentication");
  auth.command("login").description("[deprecated] Authenticate with an API key — prefer `renaiss-shipflow login`").argument("[api-key]", "API key (sfk_...)").action(runAction(async (apiKey) => {
    if (!apiKey) {
      const { promptText: promptText2 } = await Promise.resolve().then(() => (init_prompts(), exports_prompts));
      apiKey = await promptText2("Enter your RenaissShipFlow API key (sfk_...): ");
    }
    if (!apiKey) {
      console.error("Error: API key is required.");
      process.exit(1);
    }
    const config = loadConfig();
    config.apiKey = apiKey;
    saveConfig(config);
    console.log("API key saved. You can now use renaiss-shipflow commands.");
    console.log("Note: `auth login` is deprecated — prefer `renaiss-shipflow login` (GitHub sign-in, works for every command).");
  }));
  auth.command("logout").description("Clear stored credentials").action(runAction(() => {
    clearConfig();
    console.log("Logged out. Stored credentials cleared.");
  }));
  auth.command("status").description("Show current authentication status").action(runAction(() => {
    const key = resolveApiKey();
    if (key) {
      const masked = key.substring(0, 8) + "..." + key.substring(key.length - 4);
      console.log(`Authenticated with key: ${masked}`);
      if (process.env.SHIPFLOW_API_KEY) {
        console.log("  (from SHIPFLOW_API_KEY env var)");
      } else {
        console.log("  (from ~/.config/renaissshipflow/config.json)");
      }
    } else {
      console.log("Not authenticated. Run: renaiss-shipflow login");
    }
  }));
}

// src/commands/repos.ts
init_helpers();
init_output();

// src/term-render.ts
function meter(n, total) {
  if (total <= 0)
    return String(n);
  const clamped = Math.min(Math.max(n, 0), total);
  const segments = 5;
  let filled = Math.floor(clamped * segments / total);
  if (clamped > 0 && filled === 0)
    filled = 1;
  return "▰".repeat(filled) + "▱".repeat(segments - filled) + ` ${clamped}/${total}`;
}
function isWide(cp) {
  return cp >= 4352 && cp <= 4447 || cp >= 11904 && cp <= 42191 || cp >= 44032 && cp <= 55203 || cp >= 63744 && cp <= 64255 || cp >= 65280 && cp <= 65376 || cp >= 9728 && cp <= 10175 || cp >= 8960 && cp <= 9215 || cp >= 126976 && cp <= 129791;
}
function displayWidth(s) {
  let w = 0;
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp === 8205 || cp === 65039 || cp >= 768 && cp <= 879)
      continue;
    w += isWide(cp) ? 2 : 1;
  }
  return w;
}
function padDisplay(s, width) {
  return s + " ".repeat(Math.max(0, width - displayWidth(s)));
}
function renderTable(headers, rows) {
  const all = [headers, ...rows];
  const widths = headers.map((_, c) => Math.max(...all.map((r) => displayWidth(r[c] ?? ""))));
  const line = (r) => headers.map((_, c) => padDisplay(r[c] ?? "", widths[c])).join("  ").trimEnd();
  return [line(headers), widths.map((w) => "─".repeat(w)).join("  "), ...rows.map(line)];
}

// src/commands/repos.ts
function transferTarget(currentFullName, newOwner) {
  if (newOwner.includes("/"))
    return newOwner;
  return `${newOwner}/${currentFullName.split("/")[1]}`;
}
function registerRepoCommands(program2) {
  const repos = program2.command("repos").description("Manage tracked repositories");
  repos.command("list").description("List tracked repositories").option("--json", "Output as JSON").option("--yaml", "Output as YAML").action(runAction(async (_opts, cmd) => {
    const { client, org, format } = getApiCtx(cmd);
    const data = await client.listRepos(org);
    formatOutput(format, data, () => {
      if (data.length === 0) {
        console.log("No repositories tracked. Use: renaiss-shipflow repos add <owner/repo>");
        return;
      }
      printTable(["Name", "Full Name", "Active", "Workflows", "Last Activity"], data.map((r) => [
        r.name,
        r.fullName,
        r.isActive ? "yes" : "no",
        `${r.enabledWorkflowCount}/${r.workflowCount}`,
        r.lastActivityAt ?? "never"
      ]));
    });
  }));
  repos.command("add").description("Start tracking a new repository").argument("<repo>", "Full repository name (owner/repo)").action(runAction(async (repo, _opts, cmd) => {
    const { client, org } = getApiCtx(cmd);
    await client.updateWorkflow(org, repo, "issue_triage", { enabled: false });
    console.log(`Repository "${repo}" is now tracked by RenaissShipFlow.`);
  }));
  repos.command("transfer").description("Point ShipFlow at a repo's new GitHub owner after a transfer/rename (htmlUrl is derived, so it updates too)").argument("<new-owner>", "New GitHub owner; may be a full owner/name with --repo to rename at the same time").option("--repo <owner/name>", "Transfer one tracked repo (its CURRENT full name)").option("--project <name>", "Transfer every tracked repo in this ShipFlow project").option("--json", "Output as JSON").action(runAction(async (newOwner, opts, cmd) => {
    const { client, org, format } = getApiCtx(cmd);
    if (!opts.repo === !opts.project) {
      throw new Error("Pass exactly one of --repo <owner/name> or --project <name>.");
    }
    let targets;
    if (opts.repo) {
      const [owner, name, extra] = opts.repo.split("/");
      if (!owner || !name || extra !== undefined) {
        throw new Error(`--repo must be the current "owner/name", got "${opts.repo}".`);
      }
      targets = [{ owner, name }];
    } else {
      if (newOwner.includes("/")) {
        throw new Error("With --project, <new-owner> must be a bare owner (repos keep their names).");
      }
      const all = await client.listRepos(org);
      targets = all.filter((r) => r.projectName === opts.project).map((r) => {
        const [owner, name] = r.fullName.split("/");
        return { owner, name };
      });
      if (targets.length === 0) {
        const known = [...new Set(all.map((r) => r.projectName).filter(Boolean))];
        throw new Error(`No tracked repos in project "${opts.project}". Projects with repos: ${known.join(", ") || "(none)"}.`);
      }
    }
    const results = [];
    for (const t of targets) {
      results.push(await client.transferRepo(org, t.owner, t.name, transferTarget(`${t.owner}/${t.name}`, newOwner)));
    }
    formatOutput(format, results, () => {
      for (const r of results)
        console.log(`${r.previousFullName} → ${r.fullName}`);
      console.log(`${results.length} repo${results.length === 1 ? "" : "s"} transferred.`);
      console.log("");
      console.log("Next steps (ShipFlow cannot do these for you):");
      console.log(`  - Install the ShipFlow GitHub App on ${newOwner.split("/")[0]} so webhooks and reviews reconnect`);
      console.log("  - Update any external bindings (npm trusted publishing, deploys) that name the old owner");
    });
  }));
  repos.command("show").description("Show details for a specific repository").argument("<repo>", "Repository name").option("--json", "Output as JSON").option("--yaml", "Output as YAML").action(runAction(async (repo, _opts, cmd) => {
    const { client, org, format } = getApiCtx(cmd);
    const data = await client.getRepo(org, repo);
    formatOutput(format, data, () => {
      console.log(`Repository: ${data.fullName}`);
      console.log(`  Active: ${data.isActive ? "yes" : "no"}`);
      console.log(`  URL: ${data.htmlUrl}`);
      console.log(`  Workflows:`);
      if (data.workflowConfigs.length === 0) {
        console.log("    (none configured)");
      } else {
        const rows = data.workflowConfigs.map((wf) => [
          wf.workflowType,
          wf.enabled ? "enabled" : "disabled",
          wf.lastRunAt ?? "never"
        ]);
        for (const l of renderTable(["Workflow", "Status", "Last run"], rows))
          console.log(`    ${l}`);
      }
    });
  }));
}

// src/commands/workflows.ts
init_helpers();
init_output();
function registerWorkflowCommands(program2) {
  const workflows = program2.command("workflows").description("Manage repository workflows");
  workflows.command("list").description("List workflows for a repository").requiredOption("--repo <repo>", "Repository name").option("--json", "Output as JSON").option("--yaml", "Output as YAML").action(runAction(async (opts, cmd) => {
    const { client, org, format } = getApiCtx(cmd);
    const repo = await client.getRepo(org, opts.repo);
    formatOutput(format, repo.workflowConfigs, () => {
      if (repo.workflowConfigs.length === 0) {
        console.log("No workflows configured for this repository.");
        return;
      }
      printTable(["Type", "Enabled", "Last Run", "Status"], repo.workflowConfigs.map((wf) => [
        wf.workflowType,
        wf.enabled ? "yes" : "no",
        wf.lastRunAt ?? "never",
        wf.lastRunStatus ?? "-"
      ]));
    });
  }));
  workflows.command("enable").description("Enable a workflow for a repository").argument("<type>", "Workflow type (e.g. issue_triage, patch_notes)").requiredOption("--repo <repo>", "Repository name").action(runAction(async (type, opts, cmd) => {
    const { client, org } = getApiCtx(cmd);
    await client.updateWorkflow(org, opts.repo, type, { enabled: true });
    console.log(`Workflow "${type}" enabled on ${opts.repo}.`);
  }));
  workflows.command("disable").description("Disable a workflow for a repository").argument("<type>", "Workflow type (e.g. issue_triage, patch_notes)").requiredOption("--repo <repo>", "Repository name").action(runAction(async (type, opts, cmd) => {
    const { client, org } = getApiCtx(cmd);
    await client.updateWorkflow(org, opts.repo, type, { enabled: false });
    console.log(`Workflow "${type}" disabled on ${opts.repo}.`);
  }));
  workflows.command("configure").description("Configure workflow settings").argument("<type>", "Workflow type").requiredOption("--repo <repo>", "Repository name").option("--set <key=value...>", "Set configuration values", collectKeyValue, {}).action(runAction(async (type, opts, cmd) => {
    const { client, org } = getApiCtx(cmd);
    const settings = opts.set;
    if (Object.keys(settings).length === 0) {
      console.error("Error: At least one --set key=value is required.");
      process.exit(1);
    }
    await client.updateWorkflow(org, opts.repo, type, { settings });
    console.log(`Workflow "${type}" configured on ${opts.repo}.`);
    for (const [k, v] of Object.entries(settings)) {
      console.log(`  ${k} = ${v}`);
    }
  }));
}
function collectKeyValue(value, prev) {
  const idx = value.indexOf("=");
  if (idx === -1) {
    console.error(`Error: Invalid --set format "${value}". Expected key=value.`);
    process.exit(1);
  }
  prev[value.substring(0, idx)] = value.substring(idx + 1);
  return prev;
}

// src/commands/activity.ts
init_helpers();
init_output();
function registerActivityCommand(program2) {
  program2.command("activity").description("View recent workflow activity").option("--last <n>", "Number of recent events to show", "10").option("--json", "Output as JSON").option("--yaml", "Output as YAML").action(runAction(async (opts, cmd) => {
    const { client, org, format } = getApiCtx(cmd);
    const limit = parseInt(opts.last, 10) || 10;
    const result = await client.listActivity(org, { limit });
    const events = result.data;
    formatOutput(format, events, () => {
      if (events.length === 0) {
        console.log("No recent activity.");
        return;
      }
      printTable(["Time", "Repo", "Workflow", "Status", "Trigger"], events.map((e) => [
        e.startedAt,
        e.repoName || e.repositoryId || "-",
        e.workflowType,
        e.status,
        e.triggerEvent || "-"
      ]));
    });
  }));
}

// src/commands/channels.ts
init_helpers();
init_output();
init_shipflow_contract_data();
function registerChannelCommands(program2) {
  const channels = program2.command("channels").description("Manage notification channels");
  channels.command("list").description("List notification channels").option("--json", "Output as JSON").option("--yaml", "Output as YAML").action(runAction(async (_opts, cmd) => {
    const { client, org, format } = getApiCtx(cmd);
    const data = await client.listChannels(org);
    formatOutput(format, data, () => {
      if (data.length === 0) {
        console.log("No notification channels configured.");
        return;
      }
      printTable(["ID", "Type", "Label", "Identifier", "Created"], data.map((c) => [
        c.id,
        c.channelType,
        c.label,
        c.channelIdentifier,
        c.createdAt
      ]));
    });
  }));
  channels.command("add").description("Add a notification channel").requiredOption("--type <type>", `Channel type (${SHIPFLOW_CONTRACT.channelTypes.values.join(", ")})`).requiredOption("--identifier <id>", "Channel identifier (e.g. channel ID, URL)").requiredOption("--label <name>", "Display label").action(runAction(async (opts, cmd) => {
    const { client, org } = getApiCtx(cmd);
    const channel = await client.addChannel(org, {
      channelType: opts.type,
      channelIdentifier: opts.identifier,
      label: opts.label
    });
    console.log(`Channel "${channel.label}" (${channel.channelType}) added.`);
    console.log(`  ID: ${channel.id}`);
  }));
}

// src/commands/stats.ts
init_helpers();
init_output();
var STAGE_TABLE_HEADERS = [
  "Stage",
  "Requests",
  "Tokens In",
  "Tokens Out",
  "Cache Hits",
  "Cost (USD)"
];
function num(n) {
  return (n ?? 0).toLocaleString("en-US");
}
function cost(n) {
  return `$${(n ?? 0).toFixed(4)}`;
}
function cacheHits(cacheReadTokens, tokensIn) {
  const read = cacheReadTokens ?? 0;
  if (read <= 0)
    return "0";
  if (!tokensIn || tokensIn <= 0)
    return num(read);
  const pct = Math.round(read / (read + tokensIn) * 100);
  return `${num(read)} (${pct}%)`;
}
function buildStageRows(stats) {
  const byStage = stats.byStage ?? {};
  return Object.entries(byStage).sort((a, b) => (b[1].costUsd ?? 0) - (a[1].costUsd ?? 0)).map(([stage, s]) => [
    stage,
    num(s.requests),
    num(s.tokensIn),
    num(s.tokensOut),
    cacheHits(s.cacheReadTokens ?? 0, s.tokensIn),
    cost(s.costUsd)
  ]);
}
function registerStatsCommand(program2) {
  program2.command("stats").description("Show usage statistics for the current billing period").option("--tokens", "Show per-stage AI token usage (from ai_logs) instead of execution counts").option("--days <n>", "Lookback window in days for --tokens (default 30)", "30").option("--json", "Output as JSON").option("--yaml", "Output as YAML").action(runAction(async (opts, cmd) => {
    const { client, org, format } = getApiCtx(cmd);
    if (opts.tokens) {
      const days = Number.parseInt(String(opts.days), 10);
      const windowDays = Number.isFinite(days) && days > 0 ? days : 30;
      const stats2 = await client.getTokenStats(org, windowDays);
      formatOutput(format, stats2, () => {
        console.log(`AI Token Usage (last ${windowDays} days)`);
        console.log(`  Total Requests: ${num(stats2.totalRequests)}`);
        console.log(`  Tokens In:      ${num(stats2.totalTokensIn)}`);
        console.log(`  Tokens Out:     ${num(stats2.totalTokensOut)}`);
        console.log(`  Cache Hits:     ${cacheHits(stats2.totalCacheReadTokens ?? 0, stats2.totalTokensIn)}`);
        console.log(`  Total Cost:     ${cost(stats2.totalCostUsd)}`);
        const rows = buildStageRows(stats2);
        if (rows.length === 0) {
          console.log(`
No AI usage recorded for this period.`);
          return;
        }
        console.log(`
By Stage:`);
        printTable(STAGE_TABLE_HEADERS, rows);
      });
      return;
    }
    const stats = await client.getStats(org);
    formatOutput(format, stats, () => {
      console.log(`Usage Statistics`);
      console.log(`  ${meter(stats.successCount, stats.totalExecutions)} succeeded`);
      console.log(`  Total Executions: ${stats.totalExecutions}`);
      console.log(`  Succeeded:        ${stats.successCount}`);
      console.log(`  Failed:           ${stats.failureCount}`);
      console.log(`  Active Repos:     ${stats.activeRepos}`);
      if (stats.workflowBreakdown && Object.keys(stats.workflowBreakdown).length > 0) {
        console.log(`  By Workflow:`);
        const rows = Object.entries(stats.workflowBreakdown).map(([type, count]) => [type, String(count)]);
        for (const l of renderTable(["Workflow", "Runs"], rows))
          console.log(`    ${l}`);
      }
    });
  }));
}

// src/commands/trigger.ts
init_helpers();
function registerTriggerCommand(program2) {
  program2.command("trigger").description("Manually trigger a workflow").argument("<workflow-type>", "Workflow type to trigger (e.g. regression_tests)").requiredOption("--repo <repo>", "Repository name").option("--json", "Output JSON").option("--yaml", "Output YAML").action(runAction(async (workflowType, opts, cmd) => {
    const { client, org } = getApiCtx(cmd);
    await client.updateWorkflow(org, opts.repo, workflowType, {
      settings: { _trigger: true }
    });
    emit(opts, { workflowType, repo: opts.repo, triggered: true }, () => console.log(`Workflow "${workflowType}" triggered on ${opts.repo}.`));
  }));
}

// src/commands/login.ts
init_gh();
init_client();
init_config();
init_prompts();
init_helpers();

// src/github-credential.ts
function credentialMode(github) {
  if (!github)
    return "none";
  if (github.mode)
    return github.mode;
  return github.connected ? "app" : "none";
}
function day(iso) {
  return iso ? iso.slice(0, 10) : "";
}
function formatGitHubCredentialLine(github) {
  const mode = credentialMode(github);
  if (mode === "app") {
    const parts = ["GitHub App"];
    if (github?.installationId)
      parts.push(`installation ${github.installationId}`);
    parts.push("events delivered");
    if (github?.tokenIdle && github.account)
      parts.push(`idle token from @${github.account}`);
    return parts.join(" · ");
  }
  if (mode === "token") {
    const parts = ["personal token"];
    if (github?.account)
      parts.push(`@${github.account}`);
    if (github?.tokenType)
      parts.push(github.tokenType);
    parts.push(github?.tokenExpiresAt ? `expires ${day(github.tokenExpiresAt)}` : "no expiry");
    const status = github?.tokenStatus ?? "active";
    const icon = { active: "✅", expiring: "⚠️", revoked: "⛔", insufficient: "⚠️" };
    parts.push(`${icon[status] ?? "❔"} ${status}`);
    if (status !== "active" && github?.tokenDetail)
      parts.push(github.tokenDetail);
    parts.push("events: not delivered");
    return parts.join(" · ");
  }
  return "not connected";
}
function formatTokenConnectSummary(org, github) {
  const who = github?.account ? `@${github.account}` : "your GitHub account";
  const kind = github?.tokenType ? ` (${github.tokenType}${github.tokenExpiresAt ? `, expires ${day(github.tokenExpiresAt)}` : ", no expiry"})` : "";
  return [
    `Connected ${org} with a personal token: ShipFlow acts as ${who}${kind}.`,
    "GitHub events are not delivered in token mode — workflows run when triggered from the CLI, the dashboard, or a schedule.",
    "Install the GitHub App when an org admin approves it; ShipFlow switches over automatically and keeps the token idle."
  ].join(`
`);
}

// src/commands/login.ts
function parseNoTenantPayload(body) {
  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    return null;
  }
  if (payload?.error?.code !== "NO_TENANT")
    return null;
  return payload;
}
function formatNoTenantHelp(body) {
  const payload = parseNoTenantPayload(body);
  if (!payload)
    return null;
  const appSlug = payload.appSlug || "renaissshipflow";
  const installUrl = `https://github.com/apps/${appSlug}/installations/new`;
  const orgs = Array.isArray(payload.orgs) ? payload.orgs : [];
  const lines = [
    "No ShipFlow organization is set up for your GitHub account yet.",
    "",
    "ShipFlow runs on a GitHub App you install on an org you belong to. Install it here:",
    `  ${installUrl}`
  ];
  if (orgs.length > 0) {
    lines.push("", "Your GitHub orgs:");
    for (const o of orgs) {
      lines.push(o.installed ? `  ✓ ${o.login} — app installed (retry \`renaiss-shipflow login\` in a moment)` : `  ✗ ${o.login} — app not installed`);
    }
  } else {
    lines.push("", "No organizations were found on your GitHub account — install the app on one to get started.");
  }
  lines.push("", "Waiting on an org admin to approve the App? Bridge the gap with your gh token instead (#980):", "  renaiss-shipflow login --with-gh-token --org <org>", "ShipFlow then acts as your GitHub account; GitHub events are not delivered until the App is installed.", "", "Once the app is installed, run `renaiss-shipflow login` again.");
  return lines.join(`
`);
}
function pickTokenConnectOrg(orgs, explicit) {
  if (explicit?.trim())
    return explicit.trim();
  const candidates = (orgs ?? []).filter((o) => !o.installed && !o.connected);
  return candidates.length === 1 ? candidates[0].login : null;
}
function tokenConnectCandidates(orgs) {
  return (orgs ?? []).filter((o) => !o.installed && !o.connected).map((o) => o.login);
}
function tokenConnectTargetAfterExchange(tenants, org) {
  const o = org?.trim();
  if (!o) {
    const have = tenants.map((t) => t.tenant.githubOrg).join(", ");
    return {
      kind: "note",
      message: `You already belong to ${tenants.length} ShipFlow tenant${tenants.length === 1 ? "" : "s"} (${have}); ` + "pass --org <login> to connect another org with your gh token."
    };
  }
  const hit = tenants.find((t) => t.tenant.githubOrg.toLowerCase() === o.toLowerCase());
  return hit ? { kind: "already", org: hit.tenant.githubOrg } : { kind: "connect", org: o };
}
function formatTokenConnectError(status, body) {
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    parsed = undefined;
  }
  const code = parsed?.error?.code;
  if (status === 422 || code === "GITHUB_TOKEN_INSUFFICIENT") {
    const problems = parsed?.report?.problems ?? [];
    const lines = ["Your gh token does not cover what ShipFlow needs for this org:"];
    for (const p of problems)
      lines.push(`  • ${p}`);
    if (problems.length === 0 && parsed?.error?.message)
      lines.push(`  • ${parsed.error.message}`);
    lines.push("", "Fix: `gh auth refresh -s repo,read:org` (classic scopes), or make sure your account can reach the org's repositories, then retry.");
    return lines.join(`
`);
  }
  if (status === 409 || code === "TENANT_EXISTS") {
    return parsed?.error?.message || "This organization is already connected to ShipFlow. Run `renaiss-shipflow login` without --with-gh-token.";
  }
  if (status === 503 || code === "TOKEN_STORAGE_UNAVAILABLE") {
    return "This ShipFlow server cannot store tokens: SECRET_ENCRYPTION_KEY is not configured. Ask whoever runs it to set one.";
  }
  return null;
}
function registerLoginCommand(program2) {
  program2.command("login").description("Sign in to ShipFlow (uses gh auth)").option("--no-gh-bootstrap", "Don't auto-run `gh auth login` if gh isn't logged in").option("--with-gh-token", "If no ShipFlow org exists for your account yet, connect one with your gh token — a bridge while the GitHub App install awaits an org admin's approval (#980)").option("--org <login>", "Org to connect with --with-gh-token (defaults to your only org without the App)").action(runAction(async (opts) => {
    if (!ghInstalled()) {
      console.error("gh (GitHub CLI) is not installed. See https://cli.github.com/");
      process.exit(1);
    }
    if (ghAuthStatus() === "logged-out") {
      if (!opts.ghBootstrap) {
        console.error("gh is not logged in. Run `gh auth login` first or omit --no-gh-bootstrap.");
        process.exit(1);
      }
      if (!ghAuthLogin()) {
        console.error("gh auth login was cancelled or failed.");
        process.exit(1);
      }
    }
    const ghToken = ghAuthToken();
    if (!ghToken) {
      console.error("Could not read gh auth token.");
      process.exit(1);
    }
    const apiUrl = resolveApiUrl(program2.opts().apiUrl);
    const client = new ShipFlowClient({ baseUrl: apiUrl });
    let result;
    let connectedLine = "";
    try {
      result = await client.exchangeGhToken(ghToken);
      if (opts.withGhToken) {
        const target = tokenConnectTargetAfterExchange(result.tenants, opts.org);
        if (target.kind === "connect") {
          const connected = await connectOrgWithGhToken(client, ghToken, target.org);
          result = connected.result;
          connectedLine = connected.line;
        } else if (target.kind === "note") {
          console.error(target.message);
        }
      }
    } catch (err) {
      const payload = err instanceof ApiError && err.status === 403 ? parseNoTenantPayload(err.body) : null;
      if (!payload)
        throw err;
      if (!opts.withGhToken) {
        console.error(formatNoTenantHelp(err instanceof ApiError ? err.body : "") ?? String(err));
        process.exit(1);
      }
      const org = await pickOrgForTokenConnect(payload, opts.org);
      const connected = await connectOrgWithGhToken(client, ghToken, org);
      result = connected.result;
      connectedLine = connected.line;
    }
    const wanted = opts.org?.trim().toLowerCase();
    let chosen = result.tenants.find((t) => wanted && t.tenant.githubOrg.toLowerCase() === wanted) ?? result.tenants[0];
    if (result.tenants.length > 1 && !(wanted && chosen.tenant.githubOrg.toLowerCase() === wanted)) {
      const idx = await promptSelect("You belong to multiple ShipFlow tenants. Pick one:", result.tenants.map((t) => `${t.tenant.displayName} (${t.tenant.githubOrg})`));
      chosen = result.tenants[idx];
    }
    saveCredentials({
      jwt: chosen.token,
      refreshToken: chosen.refreshToken,
      tenantId: chosen.tenant.id,
      org: chosen.tenant.githubOrg,
      expiresAt: Math.floor(Date.now() / 1000) + 24 * 60 * 60
    });
    const cfg = loadConfig();
    cfg.defaultOrg = chosen.tenant.githubOrg;
    cfg.apiUrl = apiUrl;
    let gitLine = "";
    try {
      const u = ghUser();
      cfg.gitName = u.name;
      cfg.gitEmail = ghMatchedEmail(u);
      gitLine = `
Git identity captured: ${cfg.gitName} <${cfg.gitEmail}> — apply per-repo with \`renaiss-shipflow git-identity --fix\`.`;
    } catch {
      gitLine = "\n⚠️ Could not read the GitHub account's email — run `renaiss-shipflow git-identity --fix` later.";
    }
    saveConfig(cfg);
    const profile = activeProfile();
    const where = profile ? ` [profile: ${profile}]` : "";
    if (connectedLine)
      console.log(connectedLine);
    console.log(`Signed in as @${process.env.USER ?? "you"} for ${chosen.tenant.displayName} (${apiUrl})${where}.${gitLine}`);
    if (!profile && result.tenants.length > 1) {
      console.log(`Tip: you belong to multiple tenants — keep them side by side with profiles, e.g.
` + `  renaiss-shipflow --profile ${chosen.tenant.githubOrg} login`);
    }
  }));
}
async function pickOrgForTokenConnect(payload, explicitOrg) {
  const picked = pickTokenConnectOrg(payload.orgs, explicitOrg);
  if (picked)
    return picked;
  const candidates = tokenConnectCandidates(payload.orgs);
  if (candidates.length === 0) {
    console.error(`No org to connect: every GitHub org on your account already has the ShipFlow App or a tenant.
` + "Run `renaiss-shipflow login` without --with-gh-token, or name one explicitly with --org <login>.");
    process.exit(1);
  }
  const idx = await promptSelect("Which org should ShipFlow connect with your gh token?", candidates);
  return candidates[idx];
}
async function connectOrgWithGhToken(client, ghToken, org) {
  try {
    const connected = await client.connectWithToken(ghToken, org);
    return { result: connected, line: formatTokenConnectSummary(org, connected.github) };
  } catch (err) {
    if (err instanceof ApiError) {
      const msg = formatTokenConnectError(err.status, err.body);
      if (msg) {
        console.error(msg);
        process.exit(1);
      }
    }
    throw err;
  }
}

// src/commands/git-identity.ts
init_gh();
init_config();
import { execFileSync, execSync as execSync3 } from "node:child_process";
import { hostname } from "node:os";

// src/git-local.ts
init_sh();
import { realpathSync } from "node:fs";
import { basename } from "node:path";
function parseWorktrees(porcelain) {
  const records = [];
  let cur = null;
  const flush = () => {
    if (cur)
      records.push({ ...cur, isMain: records.length === 0 });
  };
  for (const raw of porcelain.split(`
`)) {
    const line = raw.trim();
    if (line.startsWith("worktree ")) {
      flush();
      cur = { path: line.slice("worktree ".length).trim(), branch: null };
    } else if (line.startsWith("branch ") && cur) {
      cur.branch = line.slice("branch ".length).trim();
    }
  }
  flush();
  return records;
}
function cleanupMergedLocalBranch(headBranch) {
  if (!headBranch)
    return;
  try {
    const worktrees = parseWorktrees(_exec("git worktree list --porcelain").toString());
    const held = worktrees.find((w) => w.branch === `refs/heads/${headBranch}`);
    if (held) {
      try {
        const currentTop = _exec("git rev-parse --show-toplevel").toString().trim();
        const isReusableLoopWorktree = basename(held.path) === "shipflow-loop";
        const isCurrentCwd = (() => {
          try {
            return realpathSync(held.path) === realpathSync(currentTop);
          } catch {
            return held.path === currentTop;
          }
        })();
        if (!held.isMain && !isReusableLoopWorktree && !isCurrentCwd) {
          _exec(`git worktree remove --force ${shellQuote(held.path)}`, { stdio: "ignore" });
        } else {
          _exec(`git -C ${shellQuote(held.path)} checkout --detach`, { stdio: "ignore" });
        }
      } catch {}
    }
    _exec(`git branch -D ${shellQuote(headBranch)}`, { stdio: "ignore" });
    _exec("git worktree prune", { stdio: "ignore" });
  } catch {}
}
var GC_BRANCH_PREFIX = "fix/";
var GC_MAX_BRANCHES = 20;
function localGcCandidates() {
  try {
    const out = _exec(`git for-each-ref --sort=committerdate --format='%(refname:short) %(objectname)' refs/heads/${GC_BRANCH_PREFIX}`).toString();
    const tips = [];
    for (const line of out.split(`
`)) {
      const m = line.trim().match(/^(\S+) ([0-9a-f]{40}(?:[0-9a-f]{24})?)$/);
      if (m)
        tips.push({ name: m[1], tip: m[2] });
    }
    if (tips.length <= GC_MAX_BRANCHES)
      return tips;
    for (let i = tips.length - 1;i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tips[i], tips[j]] = [tips[j], tips[i]];
    }
    return tips.slice(0, GC_MAX_BRANCHES);
  } catch {
    return [];
  }
}
function localRepoMatches(repoFullName) {
  try {
    const url = _exec("git remote get-url origin").toString().trim();
    const host = url.match(/^(?:[a-z][a-z0-9+.-]*:\/\/)?(?:[^@/]+@)?([^:/]+)[:/]/i)?.[1] ?? "";
    if (host.toLowerCase() !== "github.com")
      return false;
    const m = url.match(/[/:]([^/:]+\/[^/]+?)(?:\.git)?$/);
    return m ? m[1].toLowerCase() === repoFullName.toLowerCase() : false;
  } catch {
    return false;
  }
}
function localBranchExists(branch) {
  try {
    _exec(`git rev-parse --verify --quiet refs/heads/${shellQuote(branch)}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
function isAncestorOfMergedHead(tip, mergedHeadOid) {
  try {
    _exec(`git merge-base --is-ancestor ${shellQuote(tip)} ${shellQuote(mergedHeadOid)}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
function branchWorktreeDirty(branch) {
  try {
    const worktrees = parseWorktrees(_exec("git worktree list --porcelain").toString());
    const held = worktrees.find((w) => w.branch === `refs/heads/${branch}`);
    if (!held)
      return false;
    return _exec(`git -C ${shellQuote(held.path)} status --porcelain`).toString().trim() !== "";
  } catch {
    return true;
  }
}
function planMergedBranchGc(branches, mergedByHead) {
  const plan = { clean: [], unpushed: [] };
  for (const b of branches) {
    const pr = mergedByHead.get(b.name);
    if (!pr)
      continue;
    if (pr.headRefOid === b.tip)
      plan.clean.push({ name: b.name, prNumber: pr.number });
    else
      plan.unpushed.push({ name: b.name, prNumber: pr.number });
  }
  return plan;
}
var MACHINE_DOMAIN_SUFFIXES = [".local", ".ts.net", ".lan", ".internal"];
function suspiciousCommitEmail(email, hostname) {
  const e = email.trim().toLowerCase();
  if (!e || !e.includes("@"))
    return "empty or malformed";
  const domain = e.split("@")[1];
  if (domain === "localhost")
    return 'machine-derived domain "localhost"';
  for (const suf of MACHINE_DOMAIN_SUFFIXES) {
    if (domain.endsWith(suf))
      return `machine-derived domain "${domain}"`;
  }
  const h = hostname.trim().toLowerCase();
  if (h && (domain === h || domain.startsWith(h + "."))) {
    return `domain matches this machine's hostname ("${domain}")`;
  }
  return null;
}
function findSuspiciousEmails(emails, hostname) {
  const seen = new Set;
  const out = [];
  for (const email of emails) {
    const key = email.trim().toLowerCase();
    if (seen.has(key))
      continue;
    seen.add(key);
    const reason = suspiciousCommitEmail(email, hostname);
    if (reason)
      out.push(`${email} — ${reason}`);
  }
  return out;
}

// src/commands/git-identity.ts
init_helpers();
var git = (args) => {
  try {
    return execSync3(`git ${args}`, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "";
  }
};
function registerGitIdentityCommand(program2) {
  program2.command("git-identity").description("Show (or --fix) the git identity used for commits — a machine-derived user.email gets deployments blocked as unmatched").option("--fix", "Set a REPO-LOCAL user.name/user.email from the GitHub account (login-captured, else live)").option("--email <email>", "Override the email used by --fix").option("--json", "Output JSON").option("--yaml", "Output YAML").action(runAction((opts) => {
    const effectiveEmail = git("config user.email");
    const effectiveName = git("config user.name");
    const host = hostname();
    const problem = suspiciousCommitEmail(effectiveEmail, host);
    if (!opts.fix) {
      emit(opts, { name: effectiveName || null, email: effectiveEmail || null, suspicious: problem }, () => {
        console.log(`user.name:  ${effectiveName || "(unset)"}`);
        console.log(`user.email: ${effectiveEmail || "(unset)"}`);
        if (problem) {
          console.log(`⚠️ ${problem} — forges can't match this to a GitHub account (deployments get blocked).`);
          console.log("Fix with: renaiss-shipflow git-identity --fix");
          process.exit(1);
        }
      });
      return;
    }
    const cfg = loadConfig();
    let name = cfg.gitName ?? "";
    let email = opts.email ?? cfg.gitEmail ?? "";
    if (!email || !name) {
      try {
        const u = ghUser();
        name = name || u.name;
        email = email || ghMatchedEmail(u);
        cfg.gitName = cfg.gitName ?? name;
        cfg.gitEmail = cfg.gitEmail ?? email;
        saveConfig(cfg);
      } catch {
        console.error("No stored identity and `gh api user` failed — run `renaiss-shipflow login` first or pass --email.");
        process.exit(1);
      }
    }
    name = name.trim();
    email = email.trim();
    if (!name || !email) {
      console.error(`Refusing to set an incomplete identity (name=${JSON.stringify(name)}, email=${JSON.stringify(email)}). Pass --email and ensure the GitHub account has a name, or run \`renaiss-shipflow login\`.`);
      process.exit(1);
    }
    execFileSync("git", ["config", "user.name", name]);
    execFileSync("git", ["config", "user.email", email]);
    emit(opts, { fixed: true, name, email }, () => console.log(`Repo-local git identity set: ${name} <${email}>`));
  }));
}

// src/commands/init.ts
init_config();
init_project();
init_prompts();
init_helpers();
import { resolve as resolve2 } from "node:path";
function registerInitCommand(program2) {
  program2.command("init").description("Link the current repo to a ShipFlow project").action(runAction(async () => {
    const { creds, client } = loadJwtCtx(program2);
    const root = getCwdRepoRoot();
    const remote = getCwdRemote();
    if (!root || !remote) {
      console.error("Not in a git repo with a github.com origin remote.");
      process.exit(1);
    }
    const lookup = await client.getRepoByFullName(creds.org, remote.owner, remote.repo);
    if (!lookup.projects?.length) {
      console.error(`Repo ${remote.owner}/${remote.repo} is not in any project on this org.`);
      console.error("Add it via the dashboard first, then re-run init.");
      process.exit(1);
    }
    const chosen = lookup.projects.length === 1 ? lookup.projects[0] : lookup.projects[await promptSelect("Pick a project to link:", lookup.projects.map((p) => p.name))];
    const cache = loadProjectCache();
    cache[projectCacheKeyForRepoPath(resolve2(root))] = {
      projectId: chosen.id,
      projectName: chosen.name,
      org: creds.org,
      tenantId: creds.tenantId
    };
    saveProjectCache(cache);
    console.log(`Linked ${remote.owner}/${remote.repo} → ${chosen.name}.`);
  }));
}

// src/commands/status.ts
init_helpers();
function registerStatusCommand(program2) {
  program2.command("status").description("Show ShipFlow status for the current project").option("--json", "Output JSON").option("--yaml", "Output YAML").action(runAction(async (opts) => {
    const { creds, client, project } = await loadCtx(program2);
    const status = await client.getProjectStatus(creds.org, project.projectId);
    emit(opts, { project, status }, () => {
      console.log(`Project: ${project.projectName}`);
      console.log(`Repo:    ${project.repoFullName}`);
      console.log(`Org:     ${project.org}`);
      const recent = status.recentWorkflows ?? [];
      console.log(`Recent workflows: ${recent.length}`);
      const summaries = status.latestSummaries ?? {};
      const rows = Object.entries(summaries).map(([k, v]) => {
        const summary = v?.data?.exec_summary || v?.summary || "(no summary)";
        return [k, String(summary).split(`
`)[0]];
      });
      if (rows.length) {
        console.log("");
        for (const l of renderTable(["Workflow", "Latest summary"], rows))
          console.log(`  ${l}`);
      }
    }, { pretty: true });
  }));
}

// src/commands/version.ts
init_config();
init_helpers();
import { readdirSync as readdirSync3, readFileSync as readFileSync2 } from "node:fs";
import { join as join3 } from "node:path";
import { homedir as homedir3 } from "node:os";
init_client();

// src/cli-drift.ts
import { execSync as execSync4 } from "node:child_process";
import { createRequire as createRequire2 } from "node:module";
import { existsSync as existsSync2, readdirSync as readdirSync2, realpathSync as realpathSync2 } from "node:fs";
import { homedir as homedir2 } from "node:os";
import { join as join2 } from "node:path";
import { fileURLToPath } from "node:url";
var CLI_PACKAGE = "@renaiss-shipflow/cli";
var DEFAULT_REGISTRY = "https://registry.npmjs.org";
var REGISTRY_TIMEOUT_MS = 8000;
var DRIFT_STALE_EXIT_CODE = 9;
var MAIN_CLI_PACKAGE_SPEC = "origin/main:apps/renaissshipflow-cli/package.json";
var MAIN_CLI_SHOW_TIMEOUT_MS = 8000;
function parseSemver(v) {
  if (typeof v !== "string")
    return null;
  const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(v.trim());
  if (!m)
    return null;
  return { core: [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)], prerelease: m[4] ?? null };
}
function comparePrerelease(a, b) {
  const fa = a.split("."), fb = b.split(".");
  for (let i = 0;i < Math.max(fa.length, fb.length); i++) {
    const x = fa[i], y = fb[i];
    if (x === undefined)
      return -1;
    if (y === undefined)
      return 1;
    if (x === y)
      continue;
    const nx = /^\d+$/.test(x), ny = /^\d+$/.test(y);
    if (nx && ny)
      return Number(x) < Number(y) ? -1 : 1;
    if (nx !== ny)
      return nx ? -1 : 1;
    return x < y ? -1 : 1;
  }
  return 0;
}
function compareSemver(a, b) {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb)
    return 0;
  for (let i = 0;i < 3; i++) {
    if (pa.core[i] !== pb.core[i])
      return pa.core[i] < pb.core[i] ? -1 : 1;
  }
  if (pa.prerelease && !pb.prerelease)
    return -1;
  if (!pa.prerelease && pb.prerelease)
    return 1;
  if (pa.prerelease && pb.prerelease)
    return comparePrerelease(pa.prerelease, pb.prerelease);
  return 0;
}
function classifyDrift(installed, registryLatest) {
  if (!parseSemver(installed) || !parseSemver(registryLatest))
    return "unknown";
  const cmp = compareSemver(installed, registryLatest);
  return cmp === 0 ? "current" : cmp < 0 ? "stale" : "ahead";
}
function classifyPublishLag(main, npm) {
  if (!parseSemver(main) || !parseSemver(npm))
    return "unknown";
  const cmp = compareSemver(main, npm);
  return cmp === 0 ? "in-sync" : cmp > 0 ? "main-ahead" : "npm-ahead";
}
function buildPublishLag(main, npm, error) {
  const status = classifyPublishLag(main, npm);
  return { main, npm, status, error: status === "unknown" ? error ?? "unparseable version" : null };
}
var LAUNCHER_CACHE_SEGMENT = "/.shipflow/cli/";
function detectChannel(realBinPath, opts = {}) {
  if (!realBinPath)
    return "unknown";
  const p = realBinPath.replace(/\\/g, "/");
  if (p.includes("/.claude/plugins/cache/"))
    return "plugin-launcher";
  const custom = opts.stateDir ? `${opts.stateDir.replace(/\\/g, "/").replace(/\/+$/, "")}/cli/` : null;
  if (p.includes(LAUNCHER_CACHE_SEGMENT) || custom && p.includes(custom))
    return "launcher-cache";
  if (p.includes("/node_modules/@renaiss-shipflow/cli/"))
    return "npm-global";
  return "unknown";
}
var channelCache;
function resolveCliChannel() {
  if (channelCache !== undefined)
    return channelCache;
  let real = null;
  for (const candidate of [process.argv[1], fileURLToPath(import.meta.url)]) {
    if (!candidate)
      continue;
    try {
      real = realpathSync2(candidate);
      break;
    } catch {}
  }
  channelCache = detectChannel(real, { stateDir: process.env.SHIPFLOW_STATE_DIR ?? null });
  return channelCache;
}
var PLUGIN_CACHE_BASE = join2(homedir2(), ".claude", "plugins", "cache", "renaissshipflow", "shipflow");
function resolveLauncherUpdater(cacheBase = PLUGIN_CACHE_BASE) {
  try {
    const dirs = readdirSync2(cacheBase).filter((d) => /^\d/.test(d)).sort(compareSemver);
    for (let i = dirs.length - 1;i >= 0; i--) {
      const p = join2(cacheBase, dirs[i], "bin", "shipflow-cli-update");
      if (existsSync2(p))
        return p;
    }
  } catch {}
  return null;
}
var require_ = createRequire2(import.meta.url);
function cliVersion() {
  try {
    return require_("../package.json").version;
  } catch {
    return "unknown";
  }
}
function cliProvenance() {
  return { version: cliVersion(), channel: resolveCliChannel() };
}
function withProvenance(payload) {
  return { ...payload, cli: cliProvenance() };
}
var SAFE_VERSION_SPEC = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
function safeVersionSpec(v) {
  if (typeof v !== "string")
    return null;
  const t = v.trim();
  return SAFE_VERSION_SPEC.test(t) ? t : null;
}
function shellQuote2(s) {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}
function displayVersion(v) {
  return safeVersionSpec(v) ?? JSON.stringify(v.length > 40 ? `${v.slice(0, 40)}…` : v);
}
function remediationCommand(channel, target, updaterPath = null) {
  if (!target)
    return null;
  if (channel === "plugin-launcher")
    return "claude plugin update shipflow@renaissshipflow";
  if (channel === "launcher-cache")
    return updaterPath ? `${shellQuote2(updaterPath)} --force` : null;
  if (channel !== "npm-global")
    return null;
  const version = safeVersionSpec(target);
  return version ? `npm i -g ${CLI_PACKAGE}@${version}` : null;
}
function buildRemediation(drift, channel, target, pollWindowSeconds, updaterPath = null) {
  const needed = drift === "stale";
  const command = needed ? remediationCommand(channel, target, updaterPath) : null;
  const note = !needed ? "no upgrade needed" : command ? "run the command, then RE-READ `renaiss-shipflow --version` — npm exits 0 on the no-op path" : channel === "launcher-cache" ? "launcher-managed copy under the ShipFlow state dir, but no plugin-cached `bin/shipflow-cli-update` was found — reinstall the plugin; `npm i -g` would NOT fix this binary" : channel === "unknown" ? "channel unknown (dev checkout?) — upgrade by hand, do not assume npm -g owns this binary" : `registry returned no usable version (${target ? displayVersion(target) : "none"}) — refusing to build a command from it; upgrade by hand`;
  return { needed, channel, command, pollWindowSeconds, note };
}
function driftExitCode(drift) {
  return drift === "stale" ? DRIFT_STALE_EXIT_CODE : 0;
}
function registryDistTagsUrl(pkg, registry, nonce) {
  return `${registry.replace(/\/+$/, "")}/-/package/${encodeURIComponent(pkg)}/dist-tags?_cb=${encodeURIComponent(nonce)}`;
}
async function fetchRegistryLatest(opts = {}) {
  const pkg = opts.pkg ?? CLI_PACKAGE;
  const registry = opts.registry ?? process.env.SHIPFLOW_NPM_REGISTRY ?? DEFAULT_REGISTRY;
  const timeoutMs = opts.timeoutMs ?? REGISTRY_TIMEOUT_MS;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const nonce = opts.nonce ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  try {
    const res = await fetchImpl(registryDistTagsUrl(pkg, registry, nonce), {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "cache-control": "no-cache", pragma: "no-cache", accept: "application/json" }
    });
    if (!res.ok)
      return { package: pkg, latest: null, error: `HTTP ${res.status}` };
    const tags = await res.json();
    const latest = typeof tags?.latest === "string" ? tags.latest : null;
    return { package: pkg, latest, error: latest ? null : "registry returned no `latest` dist-tag" };
  } catch (e) {
    return { package: pkg, latest: null, error: e instanceof Error ? e.message : String(e) };
  }
}
var mainCliExec = execSync4;
function readMainCliVersion(opts = {}) {
  const exec = opts.exec ?? mainCliExec;
  try {
    const raw = exec(`git show ${MAIN_CLI_PACKAGE_SPEC}`, {
      encoding: "utf8",
      timeout: MAIN_CLI_SHOW_TIMEOUT_MS,
      stdio: ["ignore", "pipe", "pipe"]
    });
    const text = (typeof raw === "string" ? raw : raw.toString()).trim();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { version: null, error: "origin/main CLI package.json is not valid JSON" };
    }
    const version = parsed && typeof parsed === "object" && typeof parsed.version === "string" ? parsed.version : null;
    if (!version)
      return { version: null, error: "origin/main CLI package.json has no string `version`" };
    return { version, error: null };
  } catch (e) {
    const err = e;
    const stderr = err.stderr ? String(err.stderr).trim() : "";
    return { version: null, error: stderr || (e instanceof Error ? e.message : String(e)) };
  }
}
function driftWarnings(input) {
  const { cli, plugin, registryLatest, registryError, drift, channel, updaterPath = null, publishLag = null } = input;
  const out = [];
  if (plugin && plugin !== cli) {
    out.push(`plugin ${plugin} ≠ cli ${cli} — they are lockstep-versioned, so one lags; run /shipflow-update.`);
  }
  if (drift === "stale" && registryLatest) {
    const cmd = remediationCommand(channel, registryLatest, updaterPath);
    out.push(`cli ${cli} is BEHIND npm latest ${displayVersion(registryLatest)} (channel: ${channel}) — stale verdicts under-report blockers; ` + (cmd ? `upgrade: ${cmd}, then re-read --version.` : `no automatic remediation for channel ${channel} — upgrade by hand; do NOT assume npm -g owns this binary.`));
  }
  if (registryLatest && plugin && compareSemver(plugin, registryLatest) < 0) {
    out.push(`plugin ${plugin} is behind npm latest ${displayVersion(registryLatest)} — run /shipflow-update (skill docs lag the CLI).`);
  }
  if (drift === "ahead" && registryLatest) {
    out.push(`cli ${cli} is AHEAD of npm latest ${displayVersion(registryLatest)} — unpublished build (local/dev checkout or a publish still in flight).`);
  }
  if (drift === "unknown") {
    out.push(`drift UNKNOWN — registry probe failed (${registryError ?? "unparseable version"}); treat merge verdicts as unverified.`);
  }
  if (publishLag?.status === "main-ahead" && publishLag.main && publishLag.npm) {
    out.push(`origin/main CLI ${displayVersion(publishLag.main)} is AHEAD of npm latest ${displayVersion(publishLag.npm)} — unpublished on the registry (alarm only; not a drift gate).`);
  }
  return out;
}

// src/commands/version.ts
function installedPluginVersion(cacheBase = join3(homedir3(), ".claude", "plugins", "cache", "renaissshipflow", "shipflow")) {
  try {
    const versions = readdirSync3(cacheBase).map((dir) => {
      try {
        const j = JSON.parse(readFileSync2(join3(cacheBase, dir, ".claude-plugin", "plugin.json"), "utf8"));
        return j.version || dir;
      } catch {
        return dir;
      }
    }).filter((v) => /^\d/.test(v));
    if (!versions.length)
      return null;
    return versions.sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).at(-1) ?? null;
  } catch {
    return null;
  }
}
async function probeGitHubCredential(apiUrl) {
  const auth = resolveAuthToken();
  const creds = loadCredentials();
  if (!auth || !creds)
    return null;
  let timer;
  try {
    const client = new ShipFlowClient({ baseUrl: apiUrl, ...buildClientAuth(auth, creds) });
    const org = await Promise.race([
      client.getOrg("default"),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("timed out after 8s")), 8000);
      })
    ]);
    return { line: formatGitHubCredentialLine(org.github), github: org.github };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return { line: `unknown (${error})`, error };
  } finally {
    if (timer)
      clearTimeout(timer);
  }
}
async function probeServer(apiUrl) {
  try {
    const res = await fetch(`${apiUrl}/api/v1/version`, { signal: AbortSignal.timeout(8000) });
    return res.ok ? await res.json() : { error: `HTTP ${res.status}` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
function registerVersionCommand(program2, cliVersion2) {
  program2.command("version").description("Show ShipFlow component versions: CLI, installed plugin/skill, the server build, and CLI drift vs the npm registry's latest").option("--api-url <url>", "Override the server URL for the build probe").option("--check", `Exit ${driftExitCode("stale")} when the installed CLI is BEHIND the registry (0 otherwise) — the loop's drift gate`).option("--json", "Output JSON").option("--yaml", "Output YAML").action(runAction(async (opts) => {
    const cli = cliVersion2;
    const plugin = installedPluginVersion();
    const apiUrl = resolveApiUrl(opts.apiUrl);
    const [server, registry, githubCred] = await Promise.all([
      probeServer(apiUrl),
      fetchRegistryLatest(),
      probeGitHubCredential(apiUrl)
    ]);
    const drift = classifyDrift(cli, registry.latest);
    const channel = resolveCliChannel();
    const updaterPath = channel === "launcher-cache" ? resolveLauncherUpdater() : null;
    const remediation = buildRemediation(drift, channel, registry.latest, resolveCliDriftPollSeconds(), updaterPath);
    const mainCli = readMainCliVersion();
    const publishLag = buildPublishLag(mainCli.version, registry.latest, mainCli.error ?? registry.error);
    const warnings = driftWarnings({ cli, plugin, registryLatest: registry.latest, registryError: registry.error, drift, channel, updaterPath, publishLag });
    const github = githubCred ? { ...githubCred.github, line: githubCred.line, ...githubCred.error ? { error: githubCred.error } : {} } : null;
    emit(opts, { cli, plugin, server: { url: apiUrl, ...server }, registry, drift, channel, remediation, warnings, publishLag, github }, () => {
      const serverCell = server.error ? `unreachable (${server.error})` : `${server.version ? `${server.version} · ` : ""}${(server.revision || "unknown").slice(0, 12)}${server.dirty ? "+dirty" : ""}${server.buildTime ? ` · built ${server.buildTime}` : ""}`;
      const driftIcon = { current: "✅", stale: "⛔", ahead: "\uD83E\uDDEA", unknown: "❔" };
      const lagIcon = { "in-sync": "✅", "main-ahead": "⚠️", "npm-ahead": "ℹ️", unknown: "❔" };
      const lagCell = publishLag.main ? `${publishLag.main} — publishLag ${lagIcon[publishLag.status]} ${publishLag.status}` : `unreachable (${publishLag.error}) — publishLag ❔ unknown`;
      for (const line of renderTable(["Component", "Version"], [
        ["cli", `${cli} (${channel})`],
        ["plugin/skill", plugin ?? "not installed"],
        [`server (${apiUrl})`, serverCell],
        ["npm latest", registry.latest ? `${registry.latest} — drift ${driftIcon[drift]} ${drift}` : `unreachable (${registry.error}) — drift ❔ unknown`],
        ["origin/main CLI", lagCell],
        ...githubCred ? [["github credential", githubCred.line]] : []
      ]))
        console.log(line);
      for (const w of warnings)
        console.log(`⚠️  ${w}`);
      if (remediation.needed && remediation.command)
        console.log(`→ ${remediation.command}`);
    });
    if (opts.check)
      process.exit(driftExitCode(drift));
  }));
}

// src/commands/issues.ts
init_gh();
import { writeFileSync as writeFileSync2 } from "node:fs";
import { resolve as resolve3 } from "node:path";

// src/issue-similarity.ts
var STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "of",
  "to",
  "in",
  "on",
  "at",
  "by",
  "for",
  "from",
  "with",
  "as",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "it",
  "its",
  "this",
  "that",
  "these",
  "those",
  "there",
  "here",
  "when",
  "while",
  "via",
  "if",
  "then",
  "than",
  "so",
  "such",
  "into",
  "onto",
  "over",
  "under",
  "about",
  "after",
  "before",
  "during",
  "between",
  "across",
  "per",
  "each",
  "any",
  "all",
  "some",
  "more",
  "most",
  "less",
  "least",
  "only",
  "just",
  "also",
  "still",
  "yet",
  "does",
  "do",
  "did",
  "doing",
  "done",
  "has",
  "have",
  "had",
  "having",
  "can",
  "could",
  "should",
  "would",
  "may",
  "might",
  "must",
  "will",
  "shall",
  "we",
  "you",
  "i",
  "they",
  "he",
  "she",
  "them",
  "us",
  "me",
  "my",
  "your",
  "our",
  "their",
  "his",
  "her",
  "own",
  "same",
  "too",
  "very",
  "now"
]);
var NEGATIONS = new Set(["not", "no", "nor", "without", "never", "non"]);
var CONTRACTIONS = [
  [/\bcannot\b/g, "can not"],
  [/\bcan'?t\b/g, "can not"],
  [/\bwon'?t\b/g, "will not"],
  [/\bshan'?t\b/g, "shall not"],
  [/\b([a-z]+)n't\b/g, "$1 not"],
  [/\b(is|are|was|were|do|does|did|has|have|had|could|would|should|must|need|ai)nt\b/g, "$1 not"]
];
function expandContractions(s) {
  let out = s.replace(/[‘’ʼ´`]/g, "'");
  for (const [re, to] of CONTRACTIONS)
    out = out.replace(re, to);
  return out;
}
var CONVENTIONAL_PREFIX = /^(fix|feat|chore|ci|docs|refactor|test|perf|decide|triage|epic|cli|security)(?:\(([^)]*)\))?:\s*/;
var DUPLICATE_THRESHOLD = 0.7;
var DUPLICATE_SCAN_LIMIT = 1000;
var MIN_TOKENS_FOR_MATCH = 3;
var CITATION_SPAN = /(?<![\w/])#([0-9]+)\b(-[\p{L}\p{N}-]*)?/gu;
var STANDALONE_NUMBER = /(?<!\w)(\d+)\b/g;
function issueNumberKey(digits) {
  return digits.replace(/^0+(?=\d)/, "");
}
function citedOnlyNumbers(raw) {
  const cited = new Map;
  for (const m of raw.matchAll(CITATION_SPAN)) {
    const key = issueNumberKey(m[1]);
    cited.set(key, (cited.get(key) ?? 0) + 1);
  }
  if (cited.size === 0)
    return new Set;
  const seen = new Map;
  for (const m of raw.matchAll(STANDALONE_NUMBER)) {
    const key = issueNumberKey(m[1]);
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  const out = new Set;
  for (const [n, count] of cited)
    if (seen.get(n) === count)
      out.add(n);
  return out;
}
function citationOriginRewrites(raw, citations) {
  const out = new Map;
  if (citations.size === 0)
    return out;
  for (const m of raw.matchAll(CITATION_SPAN)) {
    const key = issueNumberKey(m[1]);
    if (!citations.has(key))
      continue;
    const suffix = (m[2] ?? "").replace(/-+$/g, "");
    const from = (m[1] + suffix).replace(/^-+|-+$/g, "");
    const to = (key + suffix).replace(/^-+|-+$/g, "");
    if (from.length > 0)
      out.set(from, to);
  }
  return out;
}
function normalizeTitle(title) {
  const raw = (title ?? "").toLowerCase().trim();
  const citations = citedOnlyNumbers(raw);
  const rewrites = citationOriginRewrites(raw, citations);
  const citationTokens = new Set;
  let s = expandContractions(raw);
  let type = null;
  let area = null;
  const m = CONVENTIONAL_PREFIX.exec(s);
  if (m) {
    type = m[1];
    area = (m[2] ?? "").trim() || null;
    s = s.slice(m[0].length);
  }
  const tokens = (s.match(/[\p{L}\p{N}][\p{L}\p{N}-]*/gu) ?? []).map((t) => t.replace(/^-+|-+$/g, "")).map((t) => {
    const rewritten = rewrites.get(t);
    if (rewritten === undefined)
      return t;
    citationTokens.add(rewritten);
    return rewritten;
  }).filter((t) => t.length > 0 && !(t.length === 1 && /[a-z]/.test(t))).filter((t) => !STOPWORDS.has(t));
  return { type, area, tokens, citations, citationTokens };
}
function discriminators(tokens, exclude) {
  return new Set(tokens.filter((t) => (/\p{N}/u.test(t) || NEGATIONS.has(t)) && !(exclude !== undefined && exclude.has(t))));
}
function sameSet(a, b) {
  if (a.size !== b.size)
    return false;
  for (const x of a)
    if (!b.has(x))
      return false;
  return true;
}
function minus(s, drop) {
  if (drop === undefined || drop.size === 0)
    return s;
  const out = new Set;
  for (const t of s)
    if (!drop.has(t))
      out.add(t);
  return out;
}
function sameSetIgnoring(a, b, ignore) {
  return sameSet(minus(a, ignore), minus(b, ignore));
}
function dice(a, b) {
  if (a.size === 0 || b.size === 0)
    return 0;
  let shared = 0;
  for (const t of a)
    if (b.has(t))
      shared++;
  return 2 * shared / (a.size + b.size);
}
function citationExclude(self, mine, theirs) {
  if (!mine.citations.has(self) && !theirs.citations.has(self))
    return;
  const out = new Set([self]);
  for (const side of [mine, theirs]) {
    for (const t of side.citationTokens) {
      if (t === self || t.startsWith(`${self}-`))
        out.add(t);
    }
  }
  return out;
}
function contains(shorter, longer) {
  for (const t of shorter)
    if (!longer.has(t))
      return false;
  return true;
}
function findDuplicateCandidates(title, openIssues, opts = {}) {
  const threshold = opts.threshold ?? DUPLICATE_THRESHOLD;
  const limit = opts.limit ?? 5;
  const mine = normalizeTitle(title);
  const mineSet = new Set(mine.tokens);
  if (mineSet.size === 0)
    return [];
  const out = [];
  for (const issue of openIssues) {
    if (opts.excludeNumber !== undefined && issue.number === opts.excludeNumber)
      continue;
    const theirs = normalizeTitle(issue.title);
    const theirSet = new Set(theirs.tokens);
    if (theirSet.size === 0)
      continue;
    if (mine.area && theirs.area && mine.area !== theirs.area)
      continue;
    if (mine.type && theirs.type && mine.type !== theirs.type)
      continue;
    const self = String(issue.number);
    const selfExclude = citationExclude(self, mine, theirs);
    if (!sameSet(discriminators(mine.tokens, selfExclude), discriminators(theirs.tokens, selfExclude)))
      continue;
    const [shorter, longer] = mineSet.size <= theirSet.size ? [mineSet, theirSet] : [theirSet, mineSet];
    if (shorter.size < MIN_TOKENS_FOR_MATCH) {
      if (!sameSetIgnoring(shorter, longer, selfExclude))
        continue;
    } else if (!contains(shorter, longer))
      continue;
    const score = dice(minus(mineSet, selfExclude), minus(theirSet, selfExclude));
    if (score >= threshold) {
      out.push({ number: issue.number, title: issue.title, score: Math.round(score * 1000) / 1000 });
    }
  }
  out.sort((a, b) => b.score - a.score || a.number - b.number);
  return out.slice(0, limit);
}

// src/xlsx.ts
function buildXlsx(sheetName, headers, rows) {
  const sheet = sheetXml([headers, ...rows]);
  const entries = [
    { name: "[Content_Types].xml", data: Buffer.from(CONTENT_TYPES_XML) },
    { name: "_rels/.rels", data: Buffer.from(ROOT_RELS_XML) },
    { name: "xl/workbook.xml", data: Buffer.from(workbookXml(sheetName)) },
    { name: "xl/_rels/workbook.xml.rels", data: Buffer.from(WORKBOOK_RELS_XML) },
    { name: "xl/worksheets/sheet1.xml", data: Buffer.from(sheet) }
  ];
  return zipStore(entries);
}
var CONTENT_TYPES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` + `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` + `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` + `<Default Extension="xml" ContentType="application/xml"/>` + `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` + `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` + `</Types>`;
var ROOT_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` + `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` + `</Relationships>`;
var WORKBOOK_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` + `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` + `</Relationships>`;
function workbookXml(sheetName) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` + `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` + `<sheets><sheet name="${xmlEscape(sanitizeSheetName(sheetName))}" sheetId="1" r:id="rId1"/></sheets>` + `</workbook>`;
}
function sheetXml(rows) {
  const body = rows.map((row, r) => {
    const cells = row.map((v, c) => {
      if (v === null || v === undefined || v === "")
        return "";
      const ref = `${colRef(c)}${r + 1}`;
      if (typeof v === "number" && Number.isFinite(v)) {
        return `<c r="${ref}"><v>${v}</v></c>`;
      }
      return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(String(v))}</t></is></c>`;
    }).join("");
    return `<row r="${r + 1}">${cells}</row>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` + `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` + `<sheetData>${body}</sheetData>` + `</worksheet>`;
}
function colRef(index) {
  let n = index + 1;
  let ref = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    ref = String.fromCharCode(65 + rem) + ref;
    n = Math.floor((n - 1) / 26);
  }
  return ref;
}
var MAX_CELL_CHARS = 32767;
function xmlEscape(s) {
  let v = s;
  if (v.length > MAX_CELL_CHARS)
    v = v.slice(0, MAX_CELL_CHARS - 1) + "…";
  return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function sanitizeSheetName(name) {
  const cleaned = name.replace(/[[\]:*?/\\]/g, " ").trim() || "Sheet1";
  return cleaned.slice(0, 31);
}
var DOS_TIME = 0;
var DOS_DATE = 33;
function zipStore(entries) {
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const e of entries) {
    const name = Buffer.from(e.name, "utf8");
    const crc = crc32(e.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(67324752, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(e.data.length, 18);
    local.writeUInt32LE(e.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    chunks.push(local, name, e.data);
    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(33639248, 0);
    dir.writeUInt16LE(20, 4);
    dir.writeUInt16LE(20, 6);
    dir.writeUInt16LE(0, 8);
    dir.writeUInt16LE(0, 10);
    dir.writeUInt16LE(DOS_TIME, 12);
    dir.writeUInt16LE(DOS_DATE, 14);
    dir.writeUInt32LE(crc, 16);
    dir.writeUInt32LE(e.data.length, 20);
    dir.writeUInt32LE(e.data.length, 24);
    dir.writeUInt16LE(name.length, 28);
    dir.writeUInt32LE(0, 38);
    dir.writeUInt32LE(offset, 42);
    central.push(Buffer.concat([dir, name]));
    offset += 30 + name.length + e.data.length;
  }
  const centralBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(101010256, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...chunks, centralBuf, eocd]);
}
var CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0;i < 256; i++) {
    let c = i;
    for (let k = 0;k < 8; k++)
      c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();
function crc32(buf) {
  let c = 4294967295;
  for (let i = 0;i < buf.length; i++)
    c = CRC_TABLE[(c ^ buf[i]) & 255] ^ c >>> 8;
  return (c ^ 4294967295) >>> 0;
}

// src/commands/issues.ts
init_helpers();
var collect = (v, prev) => prev.concat([v]);
function issuesListEnvelope(project, issues, limit) {
  const returned = issues.length;
  return { project, issues, returned, truncated: returned >= limit, total: null };
}
function registerIssuesCommand(program2) {
  const issues = program2.command("issues").description("Issue listing");
  issues.command("list").description("List open issues for the current repo, with ShipFlow triage overlay").option("--state <state>", "Issue state", "open").option("--limit <n>", "Max results", String(DUPLICATE_SCAN_LIMIT)).option("--assignee <login>", "Only issues assigned to this user (@me = current gh login)").option("--json", "Output JSON").option("--yaml", "Output YAML").action(runAction(async (opts) => {
    const { project } = await loadCtx(program2);
    const assignee = opts.assignee === "@me" ? resolveMeLogin("issues list --assignee @me") : opts.assignee;
    const limit = parseInt(opts.limit, 10);
    const list = ghIssueList(project.repoFullName, opts.state, limit, assignee);
    emit(opts, issuesListEnvelope(project, list, limit), () => {
      if (!list.length) {
        console.log("No issues.");
        return;
      }
      if (list.length >= limit) {
        console.warn(`⚠️  issues list window is FULL (${list.length} issues) — anything older than the newest ${limit} was NOT fetched; raise --limit.`);
      }
      const rows = list.map((i) => [`#${i.number}`, i.title, i.labels.map((l) => l.name).join(", ")]);
      for (const l of renderTable(["#", "Title", "Labels"], rows))
        console.log(l);
    }, { pretty: true });
  }));
  issues.command("export").description("Export issue details to an Excel (.xlsx) file, with the filters GitHub issues support").option("--state <state>", "Issue state: open | closed | all", "open").option("--label <label>", "Filter by label (repeatable)", collect, []).option("--assignee <login>", "Filter by assignee").option("--author <login>", "Filter by author").option("--mention <login>", "Filter by mentioned user").option("--milestone <name>", "Filter by milestone name or number").option("--search <query>", 'GitHub search syntax (e.g. "error in:title sort:created-asc")').option("--limit <n>", "Max issues to export", String(DUPLICATE_SCAN_LIMIT)).option("--out <file>", "Output path (default: shipflow-issues-<repo>-<date>.xlsx)").action(runAction(async (opts) => {
    if (!["open", "closed", "all"].includes(opts.state)) {
      console.error(`Invalid --state ${JSON.stringify(opts.state)}: use open, closed, or all.`);
      process.exit(1);
    }
    const ctx = await loadCtx(program2);
    const repo = ctx.project.repoFullName;
    const list = ghIssueListFiltered(repo, {
      state: opts.state,
      labels: opts.label,
      assignee: opts.assignee,
      author: opts.author,
      mention: opts.mention,
      milestone: opts.milestone,
      search: opts.search,
      limit: parseInt(opts.limit, 10)
    });
    const out = resolve3(opts.out ?? `shipflow-issues-${repo.replace("/", "-")}-${new Date().toISOString().slice(0, 10)}.xlsx`);
    writeFileSync2(out, buildXlsx("Issues", EXPORT_HEADERS, list.map(issueRow)));
    console.log(`Exported ${list.length} issue${list.length === 1 ? "" : "s"} from ${repo} to ${out}`);
  }));
}
var EXPORT_HEADERS = [
  "Number",
  "Title",
  "State",
  "Labels",
  "Assignees",
  "Author",
  "Milestone",
  "Created At",
  "Updated At",
  "Closed At",
  "URL",
  "Body"
];
function issueRow(i) {
  return [
    i.number,
    i.title,
    i.state,
    i.labels.map((l) => l.name).join(", "),
    i.assignees.map((a) => a.login).join(", "),
    i.author?.login ?? "",
    i.milestone?.title ?? "",
    i.createdAt,
    i.updatedAt,
    i.closedAt ?? "",
    i.url,
    i.body
  ];
}

// src/commands/issue.ts
init_client();
init_project();
init_gh();
init_escalation_format();
init_pr_state();
import { hostname as hostname2 } from "node:os";
import { readFileSync as readFileSync3, statSync } from "node:fs";
import { basename as basename2 } from "node:path";

// src/message-lint.ts
var TABLE_ROW = /^\s*\|.+\|\s*$/m;
var CHECKLIST_ITEM = /^\s*[-*+]\s+\[[ xX]\]\s/m;
var BULLET_ITEM = /^\s*[-*+]\s+\S/m;
var NUMBERED_ITEM = /^\s*\d+[.)]\s+\S/m;
var PATH_FACT = /(?:\b[\w.-]+(?:\/[\w.-]+){2,}(?::\d+)?)|(?:\b[\w.-]+\/[\w./-]*\.\w{1,6}\b(?::\d+)?)|(?:\b[\w.-]*\w\.\w{1,6}:\d+)/;
var COUNT_FACT = /(?:^|[\s(])[+-]?\d+(?:\.\d+)?%?(?=[\s).,;:!?]|$)/;
var LABEL_FACT = /\b[A-Z][\w-]{1,24}:\s/;
function stripNonProse(body) {
  return body.replace(/```[\s\S]*?(?:```|$)/g, " ").replace(/`[^`\n]*`/g, " ").replace(/https?:\/\/[^\s)>\]]+/g, " ");
}
function splitSentences(prose) {
  return prose.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter((s) => s.length >= 3);
}
function lintMessageBody(body) {
  const b = body.trim();
  if (!b)
    return [];
  if (TABLE_ROW.test(b) || CHECKLIST_ITEM.test(b) || BULLET_ITEM.test(b) || NUMBERED_ITEM.test(b)) {
    return [];
  }
  const sentences = splitSentences(stripNonProse(b));
  if (sentences.length < 3)
    return [];
  const factSentences = sentences.filter((s) => PATH_FACT.test(s) || COUNT_FACT.test(s) || LABEL_FACT.test(s));
  if (factSentences.length < 3)
    return [];
  return [
    `body is pure prose but carries ${factSentences.length} sentences of parallel facts (paths/counts/labels) — ` + "restructure as a table (>3 facts), checklist, or bullet list so humans can skim it"
  ];
}
function visibleLineCount(body) {
  let depth = 0;
  let fenced = false;
  let count = 0;
  for (const line of body.split(`
`)) {
    if (/^\s*(```|~~~)/.test(line)) {
      if (depth === 0 && line.trim() !== "")
        count++;
      fenced = !fenced;
      continue;
    }
    if (fenced) {
      if (depth === 0 && line.trim() !== "")
        count++;
      continue;
    }
    const stripped = line.replace(/`[^`\n]*`/g, " ");
    const opens = (stripped.match(/<details\b/gi) ?? []).length;
    const closes = (stripped.match(/<\/details>/gi) ?? []).length;
    if (depth === 0 && line.trim() !== "")
      count++;
    depth = Math.max(0, depth + opens - closes);
  }
  return count;
}
var EXAMPLE_SIGNAL = /\bexample\b|\brepro/i;
var OUTCOME_SIGNAL = /\bexpected\b|\boutcome\b/i;
function lintIssueOutcome(body) {
  const b = body.trim();
  if (!b)
    return [];
  if (EXAMPLE_SIGNAL.test(b) || OUTCOME_SIGNAL.test(b))
    return [];
  return [
    "body has no Example/Repro and no Expected result/Outcome — add one concrete scenario " + "and the observable behavior once it lands (issue-body ladder, message-style.md)"
  ];
}
var MAX_TITLE_CHARS = 60;
var TITLE_AREA_PREFIX = /^\s*\[[^\]\n]{1,40}\]\s*/;
var TITLE_BARE_IDENTIFIER = /^[\w./:#@\-()[\]<>]+$/;
function lintIssueTitle(title) {
  const t = title.trim();
  if (!t)
    return [];
  const problems = [];
  const chars = [...t].length;
  if (chars > MAX_TITLE_CHARS) {
    problems.push(`title is ${chars} chars — say the user-visible outcome in ≤${MAX_TITLE_CHARS}`);
  }
  if (TITLE_AREA_PREFIX.test(t)) {
    problems.push('title opens with a "[…]" prefix — area rides on a label, not the title');
  }
  if (/[.。]$/.test(t) && !/\.\.\.$/.test(t) && !/…$/.test(t)) {
    problems.push("title ends with a period — a headline, not a sentence");
  }
  if (!/\s/.test(t) && t.length >= 3 && TITLE_BARE_IDENTIFIER.test(t)) {
    problems.push(`title is only a path/identifier ("${t.slice(0, 40)}") — say what the reader observes, then where`);
  }
  return problems;
}
var INTERNAL_JARGON = [
  "R3",
  "R4",
  "WIP",
  "dual-read",
  "cutover",
  "fail-closed",
  "merge-repoint",
  "once-key",
  "escalate-once",
  "reconcile",
  "intake",
  "precedent",
  "slice",
  "fan-out",
  "harvest",
  "auto-qa",
  "feature map"
];
var esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function jargonUsePattern(term) {
  const flags = /^[A-Z0-9]+$/.test(term) ? "g" : "gi";
  return new RegExp(`(?<![\\w-])${esc(term)}(?![\\w-])(?<gloss>\\s*(?:\\(|—|–|:\\s))?`, flags);
}
function lintJargonGloss(body) {
  const prose = stripNonProse(body);
  if (!prose.trim())
    return [];
  const problems = [];
  for (const term of INTERNAL_JARGON) {
    const re = jargonUsePattern(term);
    let used = false;
    let glossed = false;
    for (const m of prose.matchAll(re)) {
      used = true;
      if (m.groups?.gloss) {
        glossed = true;
        break;
      }
    }
    if (used && !glossed) {
      problems.push(`internal term "${term}" used without a gloss — add 3–6 words of why on its first use, e.g. \`${term} (…)\` (message-style.md, "Internal shorthand carries a gloss")`);
    }
  }
  return problems;
}
var MAX_VISIBLE_BODY_LINES = 50;
function lintBodyLength(body) {
  const visible = visibleLineCount(body);
  if (visible <= MAX_VISIBLE_BODY_LINES)
    return [];
  return [
    `body has ${visible} visible lines outside <details> (max ${MAX_VISIBLE_BODY_LINES}) — ` + "lead with a short TLDR + key changes, and fold long sections (diagrams, file tables, " + "checklists, review logs) into <details> blocks; keep any 'Deviations from brief' section visible"
  ];
}

// src/commands/issue.ts
init_config();

// src/issue-order.ts
init_pr_state();
init_shipflow_contract_data();
var NEEDS_HUMAN_LABEL = SHIPFLOW_CONTRACT.labels.names.needsHuman;
var IN_PROGRESS_LABEL = SHIPFLOW_CONTRACT.labels.names.inProgress;
var WAITING_ON_LABEL = SHIPFLOW_CONTRACT.labels.names.waitingOn;
var NEEDS_REPORTER_APPROVAL_LABEL = SHIPFLOW_CONTRACT.labels.names.needsReporterApproval;
var TRUSTED_ISSUE_AUTHOR_ASSOCIATIONS = ["OWNER", "MEMBER", "COLLABORATOR"];
function isOutsideCodeOrg(authorAssociation) {
  return !TRUSTED_ISSUE_AUTHOR_ASSOCIATIONS.includes(String(authorAssociation ?? "").trim().toUpperCase());
}
function isActionableForPickup(issue, filter) {
  if (filter.claimed)
    return false;
  const labels = issue.labels.map((l) => l.name);
  if (labels.includes(NEEDS_HUMAN_LABEL))
    return false;
  if (labels.includes(IN_PROGRESS_LABEL))
    return false;
  if (labels.includes(WAITING_ON_LABEL))
    return false;
  if (filter.intakeMode !== "off" && labels.includes(NEEDS_REPORTER_APPROVAL_LABEL))
    return false;
  if (filter.label) {
    const wantedLabel = filter.label.trim().toLowerCase();
    if (!labels.some((name) => name.trim().toLowerCase() === wantedLabel))
      return false;
  }
  if (filter.assignee) {
    const wanted = filter.assignee.trim().toLowerCase();
    if (!issue.assignees.some((a) => String(a.login ?? "").trim().toLowerCase() === wanted))
      return false;
  }
  if (filter.sliceMergedParents && isSliceMergedParked(issue, filter.sliceMergedParents, filter.openIssues ?? [], filter)) {
    return false;
  }
  return true;
}
function parseDependencyRef(ref, defaultRepo) {
  const r = ref.trim();
  const url = r.match(/github\.com\/([^/\s]+\/[^/\s]+)\/(?:issues|pull)\/(\d+)/);
  if (url)
    return { repo: url[1], number: parseInt(url[2], 10) };
  const qualified = r.match(/^([\w.-]+\/[\w.-]+)#(\d+)$/);
  if (qualified)
    return { repo: qualified[1], number: parseInt(qualified[2], 10) };
  const bare = r.match(/^#?(\d+)$/);
  if (bare)
    return { repo: defaultRepo, number: parseInt(bare[1], 10) };
  return null;
}
function formatWaitingOnMarker(dep) {
  return `<!-- shipflow:waiting-on ${dep.repo}#${dep.number} -->`;
}
function extractWaitingOnDep(comments) {
  for (let i = comments.length - 1;i >= 0; i--) {
    const c = comments[i];
    if (!c.viewerDidAuthor)
      continue;
    const m = c.body.match(/<!--\s*shipflow:waiting-on\s+([\w.-]+\/[\w.-]+)#(\d+)\s*-->/);
    if (m)
      return { repo: m[1], number: parseInt(m[2], 10) };
  }
  return null;
}
var INTAKE_GATE_MARKER = "<!-- shipflow:intake-gated -->";
function hasIntakeGateMarker(comments) {
  return comments.some((c) => c.viewerDidAuthor && /<!--\s*shipflow:intake-gated\s*-->/.test(c.body));
}
function classifyIntakeApproval(removals, lastEditedAt, renamedAt, opts) {
  let approvedAt = null;
  for (const r of removals) {
    if (!r.actorKnown)
      continue;
    if (r.actorIsBot === true && !opts?.hasIntakeAudit)
      continue;
    const t = Date.parse(r.createdAt ?? "");
    if (Number.isNaN(t))
      continue;
    if (approvedAt === null || t > approvedAt)
      approvedAt = t;
  }
  if (approvedAt === null)
    return "unapproved";
  const body = (lastEditedAt ?? "").trim();
  const changes = body === "" ? [...renamedAt] : [body, ...renamedAt];
  for (const raw of changes) {
    const changed = Date.parse((raw ?? "").trim());
    if (Number.isNaN(changed))
      return "stale";
    if (changed > approvedAt)
      return "stale";
  }
  return "approved";
}
function decideIntakeGate(issue, ctx) {
  if (ctx.intakeMode === "off")
    return "none";
  if (issue.labels.some((l) => l.name === NEEDS_REPORTER_APPROVAL_LABEL)) {
    if (issue.associationLookupFailed)
      return "none";
    if (!isOutsideCodeOrg(issue.authorAssociation))
      return "heal";
    return "none";
  }
  if (!isOutsideCodeOrg(issue.authorAssociation))
    return "none";
  if (ctx.armedBefore === null)
    return "check-marker";
  if (ctx.armedBefore) {
    if (ctx.approval == null)
      return "check-approval";
    if (ctx.approval === "approved")
      return "none";
    if (ctx.approval === "unapproved")
      return "gate-unapproved";
  }
  if (issue.associationLookupFailed)
    return "gate-this-pass";
  return "arm";
}
var INTAKE_HEAL_AUDIT_BY = "lookup-id";
function renderIntakeHealAudit(authorAssociation) {
  const assoc = String(authorAssociation ?? "").trim().toUpperCase() || "unknown";
  return [
    `✅ **\`${NEEDS_REPORTER_APPROVAL_LABEL}\` cleared** — a later author-association lookup succeeded as trusted.`,
    "",
    "| Field | Value |",
    "| --- | --- |",
    "| Cleared by | association lookup |",
    `| Read as | \`${assoc}\` |`,
    "",
    "Re-apply the label to gate this issue again.",
    "",
    `${SHIPFLOW_CONTRACT.markers.intakeGateCleared} by=${INTAKE_HEAL_AUDIT_BY} -->`
  ].join(`
`);
}
var INTAKE_CLEAR_AUDIT_READ_AS = "intake clear";
function renderIntakeClearAudit(login) {
  const who = login.trim();
  if (!who)
    throw new Error("intake clear: refusing an unattributed audit (empty login)");
  return [
    `✅ **\`${NEEDS_REPORTER_APPROVAL_LABEL}\` cleared** — maintainer un-arm via \`${INTAKE_CLEAR_AUDIT_READ_AS}\`.`,
    "",
    "| Field | Value |",
    "| --- | --- |",
    `| Cleared by | @${who} |`,
    `| Read as | \`${INTAKE_CLEAR_AUDIT_READ_AS}\` |`,
    "",
    "Re-apply the label to gate this issue again.",
    "",
    `${SHIPFLOW_CONTRACT.markers.intakeGateCleared} by=${who} -->`
  ].join(`
`);
}
function isStaleInProgress(issue, claimed, openPRIssues) {
  if (!issue.labels.some((l) => l.name === IN_PROGRESS_LABEL))
    return false;
  return !claimed.has(issue.number) && !openPRIssues.has(issue.number);
}
function isSliceMergedParked(issue, mergedPartOfParents, openIssues, filter) {
  if (!mergedPartOfParents.has(issue.number))
    return false;
  const children = openIssues.filter((c) => c.number !== issue.number && citesPartOf(c, issue.number));
  return children.every((child) => !isActionableForPickup(child, {
    claimed: filter.claimedNumbers?.has(child.number) ?? false,
    label: filter.label,
    assignee: filter.assignee,
    intakeMode: filter.intakeMode
  }));
}
function citesPartOf(issue, parent) {
  return partOfIssueNumbers(issue.title).includes(parent) || partOfIssueNumbers(issue.body).includes(parent);
}
var PRIORITY_RANK = { critical: 4, high: 3, medium: 2, low: 1 };
var SEVERITY_RANK = {
  blocking: 4,
  major: 3,
  minor: 2,
  cosmetic: 1,
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
};
function labelRank(labels, prefix, ranks) {
  let best = 0;
  for (const l of labels) {
    const name = l.name.toLowerCase();
    if (name.startsWith(prefix))
      best = Math.max(best, ranks[name.slice(prefix.length)] ?? 0);
  }
  return best;
}
function sortIssuesForPickup(issues) {
  return [...issues].sort((a, b) => {
    const byPriority = labelRank(b.labels, "priority:", PRIORITY_RANK) - labelRank(a.labels, "priority:", PRIORITY_RANK);
    if (byPriority !== 0)
      return byPriority;
    const bySeverity = labelRank(b.labels, "severity:", SEVERITY_RANK) - labelRank(a.labels, "severity:", SEVERITY_RANK);
    if (bySeverity !== 0)
      return bySeverity;
    return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
  });
}

// src/commands/issue.ts
init_shipflow_contract_data();

// src/evidence.ts
var IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"];
function isImagePath(p) {
  const lower = p.toLowerCase();
  return IMAGE_EXTS.some((e) => lower.endsWith(e));
}
var EXIT_EVIDENCE_THREAD_FAILED = 11;
function evidenceThreadVerdict(status, threadNotified, threadError) {
  const effective = status ?? (threadNotified ? "delivered" : "no-reporter-thread");
  const reason = threadError || "no reason reported by the server";
  switch (effective) {
    case "failed":
      return threadNotified ? {
        exitCode: EXIT_EVIDENCE_THREAD_FAILED,
        note: `⚠️  reporter thread delivery INCOMPLETE — some artifacts landed, at least one did not; re-send ONLY the missing ones: ${reason}`,
        isError: true,
        partial: true
      } : {
        exitCode: EXIT_EVIDENCE_THREAD_FAILED,
        note: `❌ reporter thread delivery FAILED — the reporter was NOT notified: ${reason}`,
        isError: true,
        partial: false
      };
    case "delivered":
      return { exitCode: 0, note: "\uD83D\uDCAC reporter thread notified.", isError: false, partial: false };
    default:
      return {
        exitCode: 0,
        note: "ℹ️  no chat reporter thread for this issue — nothing to notify (normal for a GitHub-filed issue, or a chat-origin issue with no uploader configured; not a failure).",
        isError: false,
        partial: false
      };
  }
}
function evidenceCommentVerdict(status, githubCommented, prCommented = false, commentError) {
  const effective = status ?? (githubCommented || prCommented ? "delivered" : "skipped");
  const reason = commentError || "no reason reported by the server";
  switch (effective) {
    case "failed":
      return {
        exitCode: EXIT_EVIDENCE_THREAD_FAILED,
        note: `❌ GitHub comment FAILED — evidence did not land on GitHub: ${reason}`,
        isError: true
      };
    case "delivered":
      return { exitCode: 0, note: "\uD83D\uDCDD GitHub comment posted.", isError: false };
    default:
      return {
        exitCode: 0,
        note: "ℹ️  GitHub comment skipped — no commenter or hollow body (not a failure).",
        isError: false
      };
  }
}
function validateEvidenceSelection(before, after, misc, labels = [], beforeCaptions = [], afterCaptions = [], imageCaptions = [], actual = [], actualCaptions = []) {
  const hasBefore = before.length > 0;
  const hasAfter = after.length > 0;
  const hasActual = actual.length > 0;
  if (hasActual && (hasBefore || hasAfter)) {
    return "--actual is for a bug with no fix yet — it can't be combined with --before/--after. Once a fix exists, attach the pair instead.";
  }
  if (hasActual) {
    const nonImage = actual.filter((p) => !isImagePath(p));
    if (nonImage.length) {
      return `--actual takes screenshot(s) of the broken state — ${nonImage.join(", ")} is not an image. Attach video/other media with --file.`;
    }
  }
  if (hasBefore !== hasAfter) {
    return "Provide BOTH --before and --after: a screenshot before the fix and one after, so the fix's effect is visible.";
  }
  if (hasBefore && before.length !== after.length) {
    return `--before (${before.length}) and --after (${after.length}) counts must match — before[i] pairs with after[i]; attach one pair per changed surface.`;
  }
  if (labels.length > 0 && !hasBefore) {
    return "--label names a --before/--after pair — there are no pairs to label.";
  }
  if (labels.length > before.length) {
    return `${labels.length} --label(s) for ${before.length} pair(s) — labels name pairs by position, so pass at most one per --before/--after pair.`;
  }
  if (beforeCaptions.length > before.length) {
    return `${beforeCaptions.length} --before-caption(s) for ${before.length} --before shot(s) — captions describe shots by position, at most one per screenshot.`;
  }
  if (afterCaptions.length > after.length) {
    return `${afterCaptions.length} --after-caption(s) for ${after.length} --after shot(s) — captions describe shots by position, at most one per screenshot.`;
  }
  if (actualCaptions.length > actual.length) {
    return `${actualCaptions.length} --actual-caption(s) for ${actual.length} --actual shot(s) — captions describe shots by position, at most one per screenshot.`;
  }
  if (imageCaptions.length > misc.length) {
    return `${imageCaptions.length} --image-caption(s) for ${misc.length} supplementary file(s) — captions describe files by position, at most one per --image/--file.`;
  }
  if (!hasBefore && !hasAfter && !hasActual) {
    if (misc.some(isImagePath)) {
      return "Screenshot evidence must show the fix — pass --before <img> and --after <img>, or --actual <img> for a bug with no fix yet. (--file is only for video or extra media.)";
    }
    if (misc.length === 0) {
      return "Nothing to attach. Provide --before and --after screenshots, or --actual for a bug report (and optionally --file for a screen recording).";
    }
  }
  return null;
}
var VIDEO_EXTS = [".mp4", ".mov", ".webm"];
var MAX_SCREENSHOT_BYTES = 8 << 20;
function isVideoPath(p) {
  const lower = p.toLowerCase();
  return VIDEO_EXTS.some((e) => lower.endsWith(e));
}
function validateScreenshotSelection(paths, captions) {
  if (paths.length === 0 && captions.length > 0) {
    return "--screenshot-caption without --screenshot — captions describe screenshots by position.";
  }
  for (const p of paths) {
    if (!isImagePath(p) && !isVideoPath(p)) {
      return `${p}: not a recognized screenshot/recording type (${[...IMAGE_EXTS, ...VIDEO_EXTS].join(" ")}).`;
    }
  }
  if (captions.length > paths.length) {
    return `${captions.length} --screenshot-caption(s) for ${paths.length} --screenshot(s) — captions describe shots by position, at most one per screenshot.`;
  }
  return null;
}
function screenshotCaptionText(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/\r?\n/g, " ");
}
function markdownLinkText(s) {
  return s.replace(/([\[\]`\\])/g, "\\$1");
}
function renderScreenshotsSection(shots) {
  if (shots.length === 0)
    return "";
  const parts = ["## Screenshots"];
  for (const s of shots) {
    const embed = isVideoPath(s.filename) ? `<video src="${s.url}" controls width="480"></video>

[▶ ${markdownLinkText(s.filename)}](${s.url})` : `<img src="${s.url}" alt="${screenshotCaptionText(s.filename)}" width="480">`;
    const caption = s.caption?.trim() ? `
<br><sub>${screenshotCaptionText(s.caption.trim())}</sub>` : "";
    parts.push(`${embed}${caption}`);
  }
  return parts.join(`

`);
}

// src/commands/issue.ts
init_prompts();

// src/judge-block.ts
init_shipflow_contract_data();
var JUDGE_OPEN = SHIPFLOW_CONTRACT.markers.judge;
var JUDGE_END = SHIPFLOW_CONTRACT.markers.judgeEnd;
var JUDGE_STATES = ["queued", "working", "review", "waiting", "blocked", "merged"];
function isJudgeState(s) {
  return JUDGE_STATES.includes(s);
}
var STATE_LABEL = {
  queued: { emoji: "⚪", label: "Queued — nothing needed from you" },
  working: { emoji: "\uD83D\uDFE2", label: "Loop working" },
  review: { emoji: "\uD83D\uDD35", label: "PR in review" },
  waiting: { emoji: "⏸", label: "Waiting on you" },
  blocked: { emoji: "\uD83D\uDD34", label: "Blocked externally" },
  merged: { emoji: "✅", label: "Merged" }
};
function judgeCell(s) {
  const prefix = SHIPFLOW_CONTRACT.markers.markerPrefix;
  return s.replace(/\s+/g, " ").trim().split(prefix).join("&lt;" + prefix.slice(1));
}
function judgeProgress(spec) {
  if (spec.progress != null && Number.isFinite(spec.progress))
    return Math.max(0, Math.min(5, Math.floor(spec.progress)));
  if (spec.state === "merged")
    return 5;
  if (spec.pr)
    return /approved/i.test(spec.prStatus ?? "") ? 4 : 3;
  return spec.state === "working" ? 1 : 0;
}
function meter2(n) {
  const k = Math.max(0, Math.min(5, n));
  return "▰".repeat(k) + "▱".repeat(5 - k);
}
function shortTime(iso) {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(iso);
  return m ? `${m[1]} ${m[2]}Z` : iso;
}
function validateJudgeSpec(spec) {
  const p = [];
  if (spec.state === "waiting" && spec.decisions.length === 0) {
    p.push("state=waiting needs at least one --decide `N: reply → consequence` — the reader must know what to type");
  }
  if (spec.state === "blocked" && !spec.blocker?.trim()) {
    p.push('state=blocked needs a blocker — pass --blocker "<gate> → #<issue>", or park the issue with `issue wait --on` so the chain can be walked');
  }
  if (spec.state === "review" && !spec.pr) {
    p.push("state=review needs --pr <n>");
  }
  spec.decisions.forEach((d, i) => {
    if (!/^\d+:\s+\S/.test(d.trim()))
      p.push(`--decide #${i + 1} must start with \`N: \` (the reply the human types): ${JSON.stringify(d)}`);
    if (!/→/.test(d))
      p.push(`--decide #${i + 1} must state its consequence after \`→\`: ${JSON.stringify(d)}`);
  });
  return p;
}
function renderJudgeBlock(spec) {
  const { emoji, label } = STATE_LABEL[spec.state];
  const head = [`${emoji} **${label}**`];
  if (spec.decisions.length)
    head.push(`${spec.decisions.length} decision${spec.decisions.length === 1 ? "" : "s"}`);
  if (spec.unblocks)
    head.push(`unblocks ${spec.unblocks} issue${spec.unblocks === 1 ? "" : "s"}`);
  head.push(`since ${shortTime(spec.since)}`);
  head.push(`checked ${shortTime(spec.checked ?? new Date().toISOString())}`);
  const lines = [`> ${head.join(" · ")}`];
  const state = [];
  const acc = spec.acceptance;
  const useAcceptance = !!acc && acc.total > 0 && spec.progress == null;
  const gauge = useAcceptance ? `${meter2(Math.round(acc.done / acc.total * 5))} ${acc.done}/${acc.total} accepted` : meter2(judgeProgress(spec));
  if (spec.pr)
    state.push(`PR #${spec.pr}${spec.prStatus?.trim() ? ` ${judgeCell(spec.prStatus)}` : ""}`);
  if (spec.blocker?.trim())
    state.push(`blocked: ${judgeCell(spec.blocker)}`);
  lines.push(`> **State** ${gauge}${state.length ? `${useAcceptance ? " · " : " "}${state.join(" · ")}` : ""}`);
  if (spec.decisions.length)
    lines.push(`> **Decide** ${spec.decisions.map((d) => "`" + judgeCell(d).replace(/`/g, "") + "`").join(" · ")}`);
  if (spec.impact?.trim())
    lines.push(`> **Impact** ${judgeCell(spec.impact)}`);
  return `${JUDGE_OPEN} state=${spec.state} since=${spec.since} -->
${lines.join(`
`)}
${JUDGE_END}`;
}
var esc2 = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
var BLOCK_RE = new RegExp(`${esc2(JUDGE_OPEN)} state=[^\\n]*-->\\n[\\s\\S]*?${esc2(JUDGE_END)}\\n*`);
function parseJudgeBlock(body) {
  const m = new RegExp(`${esc2(JUDGE_OPEN)} state=(\\S+) since=(\\S+) -->`).exec(body);
  if (!m || !isJudgeState(m[1]))
    return null;
  return { state: m[1], since: m[2] };
}
function upsertJudgeBlock(body, block) {
  if (BLOCK_RE.test(body))
    return body.replace(BLOCK_RE, `${block}

`);
  return `${block}

${body.replace(/^\s+/, "")}`;
}
function extractImpact(body) {
  const rest = body.replace(BLOCK_RE, "");
  const m = /^\*\*Impact\*\*\s+(.+?)\s*$/m.exec(rest);
  return m ? m[1].trim() : undefined;
}
function extractAcceptance(body) {
  const rest = body.replace(BLOCK_RE, "");
  let done = 0;
  let total = 0;
  for (const line of rest.split(`
`)) {
    if (/^\s*[-*]\s+\[[xX]\]\s/.test(line)) {
      done++;
      total++;
    } else if (/^\s*[-*]\s+\[ \]\s/.test(line))
      total++;
  }
  return { done, total };
}
function linesToAction(body) {
  const lines = body.split(`
`);
  const open = lines.findIndex((l) => l.startsWith(`${JUDGE_OPEN} state=`));
  if (open >= 0) {
    const end = lines.findIndex((l, i) => i > open && l.startsWith(JUDGE_END));
    const decide = lines.findIndex((l, i) => i > open && (end < 0 || i < end) && /^>\s*\*\*Decide\*\*/.test(l));
    return (decide >= 0 ? decide : open + 1) + 1;
  }
  const cue = lines.findIndex((l) => /^>\s*\*\*Decide\*\*/.test(l) || /action needed|remedy:|unblock:/i.test(l));
  return cue >= 0 ? cue + 1 : -1;
}

// src/judge-chain.ts
function nextHop(issue, repo) {
  const dep = extractWaitingOnDep(issue.comments);
  if (!dep)
    return null;
  if (dep.repo !== repo)
    return { crossRepo: `${dep.repo}#${dep.number}` };
  return { number: dep.number };
}
function rootVerdict(issue) {
  if (issue.state === "closed")
    return "closed — loop should re-admit";
  const labels = new Set(issue.labels);
  if (labels.has(NEEDS_HUMAN_LABEL))
    return "waits on you";
  if (labels.has(NEEDS_REPORTER_APPROVAL_LABEL))
    return "reporter approval";
  if (labels.has(IN_PROGRESS_LABEL))
    return "loop working";
  return "queued";
}
function walkWaitingChain(start, repo, fetch2, maxDepth = 4) {
  const hops = [start];
  const seen = new Set([start]);
  let cur = fetch2(start);
  if (!cur)
    return { hops, root: "unknown", rootIssue: null };
  for (let depth = 0;depth < maxDepth; depth++) {
    const next = nextHop(cur, repo);
    if (next === null)
      return { hops, root: rootVerdict(cur), rootIssue: cur };
    if ("crossRepo" in next)
      return { hops, root: "cross-repo", rootIssue: cur, crossRepo: next.crossRepo };
    if (seen.has(next.number)) {
      hops.push(next.number);
      return { hops, root: "cycle", rootIssue: null };
    }
    seen.add(next.number);
    hops.push(next.number);
    const n = fetch2(next.number);
    if (!n)
      return { hops, root: "unknown", rootIssue: null };
    cur = n;
  }
  return { hops, root: rootVerdict(cur), rootIssue: cur };
}
function firstDecideReply(body) {
  if (!body)
    return;
  const lines = body.split(`
`);
  const open = lines.findIndex((l) => l.startsWith(`${JUDGE_OPEN} state=`));
  if (open < 0)
    return;
  const end = lines.findIndex((l, i) => i > open && l.startsWith(JUDGE_END));
  const decide = lines.find((l, i) => i > open && (end < 0 || i < end) && /^>\s*\*\*Decide\*\*/.test(l));
  const m = decide ? /`([^`]+)`/.exec(decide) : null;
  return m ? m[1].trim() : undefined;
}
function renderChain(chain, hint) {
  const parts = chain.hops.map((n) => `#${n}`);
  if (chain.crossRepo)
    parts.push(chain.crossRepo);
  let tail = chain.root;
  if (chain.root === "cross-repo")
    tail = "another repo — not tracked here";
  if (hint && (chain.root === "waits on you" || chain.root === "reporter approval"))
    tail += ` (${hint})`;
  return `${parts.join(" → ")} → ${tail}`;
}
function fanOut(root, repo, waiting, rootIssue, maxDepth = 4) {
  const byNumber = new Map(waiting.map((i) => [i.number, i]));
  if (rootIssue)
    byNumber.set(root, rootIssue);
  const fetch2 = (n) => byNumber.get(n) ?? null;
  let count = 0;
  for (const issue of waiting) {
    if (issue.number === root)
      continue;
    const chain = walkWaitingChain(issue.number, repo, fetch2, maxDepth);
    if (chain.hops.slice(1).includes(root))
      count++;
  }
  return count;
}

// src/intake-note.ts
init_shipflow_contract_data();
var INTAKE_MARKER = SHIPFLOW_CONTRACT.markers.intake;
var LOOP_MARKER = SHIPFLOW_CONTRACT.markers.loop;
function findLatestIntakeComment(comments) {
  for (let i = comments.length - 1;i >= 0; i--) {
    const c = comments[i];
    if (c.viewerDidAuthor === false)
      continue;
    if (c.body.split(/\r?\n/).some((l) => l.trim() === INTAKE_MARKER))
      return c;
  }
  return null;
}
function stripLoopMarkers(body) {
  return body.split(`
`).filter((l) => {
    const t = l.trim();
    return t !== INTAKE_MARKER && t !== LOOP_MARKER;
  }).join(`
`).trim();
}
function renderIntakeBody(brief, previous) {
  const head = brief.trim();
  const parts = [head];
  const prev = previous ? stripLoopMarkers(previous) : "";
  if (prev) {
    parts.push(`<details>
<summary>History — superseded ${new Date().toISOString().slice(0, 10)}</summary>

${prev}

</details>`);
  }
  return `${parts.join(`

`)}

${INTAKE_MARKER}
${LOOP_MARKER}`;
}

// src/commands/issue.ts
init_helpers();
async function loadTriage(ctx, repo, number) {
  try {
    return {
      triage: await ctx.client.getTriage(ctx.creds.org, ctx.project.projectId, repo, number),
      unavailable: false
    };
  } catch (e) {
    console.warn(triageUnavailableWarning(flattenCause(e)));
    return { triage: null, unavailable: true };
  }
}
var EXIT_DUPLICATE_ISSUE = 12;
function duplicatePreflight(repo, title, opts) {
  let open;
  try {
    open = ghIssueList(repo, "open", DUPLICATE_SCAN_LIMIT);
  } catch (e) {
    console.warn(`⚠️  duplicate pre-flight SKIPPED — could not list open issues in ${repo}: ${e.message}`);
    console.warn("⚠️  Filing anyway (a GitHub outage must not block a bug report) — check for a duplicate by hand.");
    return [];
  }
  if (open.length >= DUPLICATE_SCAN_LIMIT) {
    console.warn(`⚠️  duplicate pre-flight window is FULL (${open.length} open issues) — anything older than the newest ${DUPLICATE_SCAN_LIMIT} was NOT scanned; check by hand.`);
  }
  const candidates = findDuplicateCandidates(title, open);
  if (candidates.length === 0)
    return [];
  const lines = candidates.map((c) => `#${c.number} — "${c.title}" (${c.score.toFixed(2)})`);
  if (opts.allowDuplicate) {
    console.warn(`⚠️  --allow-duplicate: filing anyway despite ${candidates.length} near-duplicate(s) at ≥${DUPLICATE_THRESHOLD}:`);
    for (const l of lines)
      console.warn(`   ${l}`);
    return candidates;
  }
  if (opts.json || opts.yaml) {
    emit(opts, { blocked: true, reason: "duplicate", candidates, threshold: DUPLICATE_THRESHOLD }, () => {});
  } else {
    console.error(`⛔ Not filed — ${candidates.length} open issue(s) already look like this:`);
    for (const l of lines)
      console.error(`   ${l}`);
    console.error("");
    console.error("Comment on the existing issue instead, or re-run with --allow-duplicate if it is genuinely a different bug.");
  }
  process.exit(EXIT_DUPLICATE_ISSUE);
}
function createIssueGuarded(args, opts, { skipPreflight = false } = {}) {
  const { repo, title, body, labels, assigneesAuto = false, lint = [] } = args;
  const requested = args.assignees ?? [];
  if (!skipPreflight)
    duplicatePreflight(repo, title, opts);
  for (const l of labels)
    ghEnsureLabel(repo, l);
  const created = ghIssueCreate(repo, title, body, labels);
  const assignees = attachAssignees(repo, created, requested, assigneesAuto);
  emit(opts, { number: created.number, url: created.url, labels, assignees, lint }, () => console.log(assignees.length > 0 ? `${created.url} — assigned to ${assignees.map((a) => `@${a}`).join(", ")}` : created.url));
}
function attachAssignees(repo, created, requested, auto) {
  if (requested.length === 0)
    return [];
  try {
    ghIssueAddAssignees(repo, created.number, requested);
  } catch (e) {
    return assignmentFailed(repo, created, requested, [], auto, firstLine(ghFailureText(e)) || "gh exited non-zero with no stderr");
  }
  let actual;
  try {
    actual = ghIssueAssignees(repo, created.number);
  } catch (e) {
    console.warn(`⚠️  assignment NOT VERIFIED for ${created.url} (gh issue view failed: ${firstLine(ghFailureText(e)) || "no stderr"}) — reporting ${requested.map((a) => `@${a}`).join(", ")} as requested; confirm on the issue if pickup matters.`);
    return requested;
  }
  const lower = new Set(actual.map((a) => a.toLowerCase()));
  const missing = requested.filter((a) => !lower.has(a.toLowerCase()));
  if (missing.length === 0)
    return actual;
  return assignmentFailed(repo, created, requested, actual, auto, `gh exited 0 but GitHub did not attach ${missing.map((a) => `@${a}`).join(", ")} (a login with no push access on ${repo} is dropped silently)`);
}
function assignmentFailed(repo, created, requested, actual, auto, reason) {
  const repair = `gh issue edit ${created.number} --repo ${repo} ${requested.map((a) => `--add-assignee ${a}`).join(" ")}`;
  if (!auto) {
    throw new Error(`Issue #${created.number} WAS created (${created.url}) but assigning ${requested.map((a) => `@${a}`).join(", ")} failed: ${reason}. The issue is filed${actual.length > 0 ? ` and assigned to ${actual.map((a) => `@${a}`).join(", ")}` : " and UNASSIGNED"} — do NOT re-file it; assign by hand: ${repair}`);
  }
  console.warn(`⚠️  auto-assign REJECTED by gh (${reason}) — ${created.url} is filed${actual.length > 0 ? ` but only assigned to ${actual.map((a) => `@${a}`).join(", ")}` : " UNASSIGNED"}; under pickup-scope=assigned this issue is invisible to \`issue next\` until someone assigns it.`);
  return actual;
}
function firstLine(msg) {
  return (msg.trim().split(`
`)[0] ?? "").trim();
}
function ghFailureText(e) {
  const err = e;
  return err.stderr != null ? String(err.stderr).trim() : "";
}
function resolveCreateAssignees(explicit, noAssign = false) {
  const hasExplicit = explicit !== undefined && explicit.length > 0;
  if (noAssign) {
    if (hasExplicit) {
      throw new UsageError("issue create: --no-assign and --assignee are mutually exclusive — pass one or the other.");
    }
    return { assignees: [], auto: false };
  }
  if (hasExplicit) {
    return { assignees: explicit.map((a) => a === "@me" ? resolveMeLogin("issue create --assignee @me") : a), auto: false };
  }
  if (resolvePickupScope() !== "assigned")
    return { assignees: [], auto: true };
  const me = ghCurrentLogin();
  if (!me) {
    console.warn("⚠️  auto-assign skipped: gh login unresolved (`gh api user` failed — auth/network?) — filing UNASSIGNED; under pickup-scope=assigned this issue is invisible to `issue next` until someone assigns it (check `gh auth status`).");
    return { assignees: [], auto: true };
  }
  return { assignees: [me], auto: true };
}
function renderReadmitBody(dep) {
  const parts = [
    `✅ Dependency ${dep.repo}#${dep.number} closed — re-admitted to the loop queue.`,
    "",
    SHIPFLOW_CONTRACT.markers.loop
  ];
  return parts.join(`
`);
}
function registerIssueCommand(program2) {
  const issue = program2.command("issue").description("Issue actions");
  issue.command("create").description("Open a new issue (and signal ShipFlow)").option("--repo <fullname>", "Override target repo").option("--title <title>", "Issue title").option("--body <body>", "Issue body (- for stdin)").option("--label <name...>", "Label(s) to apply (created if missing) — e.g. bug auto-qa").option("--assignee <login...>", "Assignee(s) for the new issue (@me = the gh login). Default under pickup-scope=assigned: the current login — assignment is the queueing gesture (#600), so an unassigned filing is invisible to `issue next`").option("--no-assign", "File UNASSIGNED, overriding the pickup-scope=assigned auto-assign default — the per-invocation opt-out for a human filing a backlog item that the loop should NOT pick up. Mutually exclusive with --assignee").option("--screenshot <path...>", "Screenshot/recording file(s) documenting the problem — hosted and embedded in the issue body (issue #457)").option("--screenshot-caption <text...>", "Caption for each --screenshot, by position — says what THAT shot shows").option("--allow-duplicate", `File even when an open issue looks like a near-duplicate (title similarity ≥${DUPLICATE_THRESHOLD}). Without it, a match creates nothing and exits ${EXIT_DUPLICATE_ISSUE}, listing the matches`).option("--json", "Output JSON").option("--yaml", "Output YAML").action(runAction(async (opts) => {
    const shots = opts.screenshot ?? [];
    const shotCaptions = opts.screenshotCaption ?? [];
    const shotErr = validateScreenshotSelection(shots, shotCaptions);
    if (shotErr) {
      console.error(shotErr);
      process.exit(1);
    }
    const ctx = await loadCtx(program2);
    const repo = opts.repo ?? ctx.project.repoFullName;
    const title = opts.title ?? await promptText("Title: ");
    let body = opts.body === "-" ? await readStdin() : opts.body ?? "";
    const lint = [...lintIssueTitle(title), ...lintMessageBody(body), ...lintBodyLength(body), ...lintIssueOutcome(body), ...lintJargonGloss(body)];
    for (const p of lint)
      console.warn(`⚠️  body lint: ${p}`);
    duplicatePreflight(repo, title, opts);
    const { assignees, auto: assigneesAuto } = resolveCreateAssignees(opts.assignee, opts.assign === false);
    if (shots.length > 0) {
      for (const p of shots) {
        const size = statSync(p).size;
        if (size > MAX_SCREENSHOT_BYTES) {
          const msg = `${p}: ${(size / (1 << 20)).toFixed(1)}MB exceeds the 8MB per-file limit — issue NOT created.`;
          if (opts.json)
            console.log(JSON.stringify({ error: msg }));
          else
            console.error(msg);
          process.exit(1);
        }
      }
      const files = shots.map((p) => ({ filename: basename2(p), data: new Uint8Array(readFileSync3(p)) }));
      let urls;
      try {
        ({ urls } = await ctx.client.uploadMedia(ctx.creds.org, ctx.project.projectId, files));
      } catch (e) {
        const msg = `Screenshot upload failed — issue NOT created: ${e.message}`;
        if (opts.json)
          console.log(JSON.stringify({ error: msg }));
        else {
          console.error(msg);
          console.error("Retry, or create without --screenshot and attach via `issue evidence --image` once the issue exists.");
        }
        process.exit(1);
      }
      if (urls.length !== files.length) {
        const msg = `Screenshot upload returned ${urls.length} URL(s) for ${files.length} file(s) — issue NOT created.`;
        if (opts.json)
          console.log(JSON.stringify({ error: msg }));
        else
          console.error(msg);
        process.exit(1);
      }
      const section = renderScreenshotsSection(files.map((f, i) => ({
        filename: f.filename,
        url: urls[i],
        caption: shotCaptions[i]
      })));
      body = body.trimEnd() ? `${body.trimEnd()}

${section}` : section;
    }
    createIssueGuarded({ repo, title, body, labels: opts.label ?? [], assignees, assigneesAuto, lint }, opts, { skipPreflight: true });
  }));
  issue.command("work <number>").description("Exclusively claim an issue (lock + dump context); exits 3 when another agent holds it").option("--repo <fullname>", "Override target repo").option("--agent <name>", "Agent label recorded on the claim (default: $SHIPFLOW_AGENT or hostname)").option("--ttl <minutes>", "Claim lifetime in minutes (default 120)").option("--json", "Output JSON").option("--yaml", "Output YAML").action(runAction(async (numberStr, opts) => {
    const ctx = await loadCtx(program2);
    const { number, repo } = resolveTarget(ctx, numberStr, opts);
    const agent = opts.agent ?? process.env.SHIPFLOW_AGENT ?? hostname2();
    try {
      await ctx.client.claimIssue(ctx.creds.org, ctx.project.projectId, number, {
        repo,
        agent,
        ttlMinutes: opts.ttl ? parseInt(opts.ttl, 10) : undefined
      });
    } catch (e) {
      if (e instanceof ClaimConflictError) {
        console.error(`⛔ #${number} is taken: ${e.message}`);
        process.exit(3);
      }
      console.warn(`Claim failed (continuing unlocked): ${e.message}`);
    }
    const issueData = ghIssueView(repo, number);
    const t = await loadTriage(ctx, repo, number);
    printIssueContext(issueData, t.triage, repo, ctx.project, opts, t.unavailable);
  }));
  issue.command("next").description("Pick & claim the next open, unclaimed issue (for the work loop); exits 4 when none remain").option("--repo <fullname>", "Override target repo").option("--label <label>", "Only consider issues with this label").option("--assignee <login>", "Only consider issues assigned to this user (@me = the gh login; default under pickup-scope=assigned)").option("--agent <name>", "Agent label recorded on the claim (default: $SHIPFLOW_AGENT or hostname)").option("--ttl <minutes>", "Claim lifetime in minutes (default 120)").option("--json", "Output JSON").option("--yaml", "Output YAML").action(runAction(async (opts) => {
    const ctx = await loadCtx(program2);
    const repo = opts.repo ?? ctx.project.repoFullName;
    const agent = opts.agent ?? process.env.SHIPFLOW_AGENT ?? hostname2();
    let assignee = opts.assignee;
    if (assignee === "@me" || assignee === undefined && resolvePickupScope() === "assigned") {
      assignee = resolveMeLogin(assignee === "@me" ? "issue next --assignee @me" : "issue next under pickup-scope=assigned (set pickup-scope all to widen)");
    }
    const open = ghIssueListWithAssociations(repo, 200, assignee, opts.label);
    let claimsUnavailable = false;
    const claims = await ctx.client.listClaims(ctx.creds.org, ctx.project.projectId).catch(() => {
      claimsUnavailable = true;
      return [];
    });
    if (claimsUnavailable) {
      console.warn("⚠️ claims API unreachable — treating issues as unclaimed (claim POST still gates) and skipping stale-label healing.");
    }
    const claimed = new Set(claims.filter((c) => c.repo === repo).map((c) => c.issueNumber));
    if (!claimsUnavailable) {
      const openPRIssues = ghOpenPRClosingIssues(repo);
      for (const i of open) {
        if (!isStaleInProgress(i, claimed, openPRIssues))
          continue;
        try {
          ghIssueRemoveLabel(repo, i.number, IN_PROGRESS_LABEL);
          i.labels = i.labels.filter((l) => l.name !== IN_PROGRESS_LABEL);
          console.warn(`♻️ #${i.number}: stripped stale "${IN_PROGRESS_LABEL}" (no live claim, no open PR) — back in the queue.`);
        } catch (e) {
          console.warn(`stale-label heal failed for #${i.number} (skipping): ${e.message}`);
        }
      }
    }
    const intakeMode = resolveIntakeApproval();
    for (const i of intakeMode === "off" ? [] : open) {
      let approvalState = null;
      let action = decideIntakeGate(i, { intakeMode, armedBefore: null });
      if (action === "check-marker") {
        let armedBefore = null;
        try {
          armedBefore = hasIntakeGateMarker(ghIssueComments(repo, i.number));
        } catch (e) {
          console.warn(`intake gate: could not read #${i.number}'s comments (gated this pass only, nothing written): ${e.message}`);
        }
        action = armedBefore === null ? "gate-this-pass" : decideIntakeGate(i, { intakeMode, armedBefore });
        if (action === "check-approval") {
          let approval = "unapproved";
          try {
            const timeline = ghIssueTimelineSignals(repo, i.number, NEEDS_REPORTER_APPROVAL_LABEL);
            const botStrip = timeline.removals.some((r) => r.actorKnown && r.actorIsBot === true);
            const hasIntakeAudit = botStrip && ghIntakeGateAuditCount(repo, i.number) > 0;
            approval = classifyIntakeApproval(timeline.removals, ghIssueLastEditedAt(repo, i.number), timeline.renamedAt, { hasIntakeAudit });
          } catch (e) {
            console.warn(`intake gate: could not read #${i.number}'s approval evidence (withheld this pass, nothing written): ${e.message}`);
          }
          approvalState = approval;
          action = decideIntakeGate(i, { intakeMode, armedBefore, approval });
        }
      }
      if (action === "heal") {
        try {
          ghIssueComment(repo, i.number, renderIntakeHealAudit(i.authorAssociation));
          ghIssueRemoveLabel(repo, i.number, NEEDS_REPORTER_APPROVAL_LABEL);
          i.labels = i.labels.filter((l) => l.name !== NEEDS_REPORTER_APPROVAL_LABEL);
          console.warn(`♻️ #${i.number}: author association ${i.authorAssociation || "unknown"} — cleared "${NEEDS_REPORTER_APPROVAL_LABEL}" (later trusted lookup).`);
        } catch (e) {
          console.warn(`intake gate: heal failed for #${i.number} (label left in place): ${e.message}`);
        }
        continue;
      }
      if (action === "none")
        continue;
      i.labels = [...i.labels, { name: NEEDS_REPORTER_APPROVAL_LABEL }];
      if (action === "gate-unapproved") {
        console.warn(`\uD83D\uDD12 #${i.number}: gate armed and no ${NEEDS_REPORTER_APPROVAL_LABEL} removal on record — ` + "withheld this pass, nothing written (another loop may have just armed it).");
        continue;
      }
      if (action === "gate-this-pass") {
        console.warn(`\uD83D\uDD12 #${i.number}: author association unreadable — gated for THIS pass only, no label written. ` + `If this persists, the association lookup is failing, not the author.`);
        continue;
      }
      try {
        ghEnsureLabel(repo, NEEDS_REPORTER_APPROVAL_LABEL);
        ghIssueAddLabels(repo, i.number, [NEEDS_REPORTER_APPROVAL_LABEL]);
        const reArm = approvalState === "stale";
        ghIssueComment(repo, i.number, [
          reArm ? `\uD83D\uDD12 **Intake gate re-armed** — this issue was approved, but its **body or title changed after** that approval, so the ShipFlow loop is no longer holding a maintainer's sign-off on the content it would build.` : `\uD83D\uDD12 **Intake gate** — this issue was filed from outside the code org (\`${i.authorAssociation || "unknown"}\`), so the ShipFlow loop will not build it until a maintainer approves.`,
          "",
          reArm ? `**To re-approve:** reply with a confirmation token after reading the current text, or remove the \`${NEEDS_REPORTER_APPROVAL_LABEL}\` label.` : `**To approve:** reply with a confirmation token, or remove the \`${NEEDS_REPORTER_APPROVAL_LABEL}\` label. The loop arms this gate **once**.`,
          "",
          SHIPFLOW_CONTRACT.intentGate.releaseHint,
          "",
          INTAKE_GATE_MARKER
        ].join(`
`));
        console.warn(reArm ? `\uD83D\uDD12 #${i.number}: edited after approval — intake gate re-armed, needs a fresh approval.` : `\uD83D\uDD12 #${i.number}: author association ${i.authorAssociation || "unknown"} — needs an approval from the code org before the loop builds it.`);
      } catch (e) {
        console.warn(`intake gate: could not label #${i.number} (still gated this tick): ${e.message}`);
      }
    }
    const healed = [];
    for (const i of open) {
      if (!i.labels.some((l) => l.name === NEEDS_HUMAN_LABEL))
        continue;
      try {
        const reply = findHumanReplyAfterEscalation(ghIssueComments(repo, i.number));
        if (!reply)
          continue;
        const decisions = parseDecisionRepliesLoose(reply.body);
        ghIssueRemoveLabel(repo, i.number, NEEDS_HUMAN_LABEL);
        i.labels = i.labels.filter((l) => l.name !== NEEDS_HUMAN_LABEL);
        ghIssueComment(repo, i.number, renderReplyAck(decisions));
        healed.push({ number: i.number, decisions });
        console.warn(`\uD83D\uDEA7 #${i.number}: human replied after the escalation — cleared "${NEEDS_HUMAN_LABEL}", acknowledged (${decisions.length ? decisions.map((d) => `${d.n}: ${d.answer}`).join(" · ") : "free text"}), competing this tick.`);
      } catch (e) {
        console.warn(`needs-human heal failed for #${i.number} (still parked): ${e.message}`);
      }
    }
    for (const i of open) {
      if (!i.labels.some((l) => l.name === WAITING_ON_LABEL) || claimed.has(i.number))
        continue;
      try {
        const dep = extractWaitingOnDep(ghIssueComments(repo, i.number));
        if (!dep)
          continue;
        if (ghIssueOrPrState(dep.repo, dep.number) !== "closed")
          continue;
        ghIssueRemoveLabel(repo, i.number, WAITING_ON_LABEL);
        i.labels = i.labels.filter((l) => l.name !== WAITING_ON_LABEL);
        ghIssueComment(repo, i.number, renderReadmitBody(dep));
        console.warn(`⏳ #${i.number}: dependency ${dep.repo}#${dep.number} closed — cleared "${WAITING_ON_LABEL}", competing this tick.`);
      } catch (e) {
        console.warn(`waiting-on heal failed for #${i.number} (still waiting): ${e.message}`);
      }
    }
    const sliceMergedParents = ghMergedPartOfParents(repo);
    const matching = open.filter((i) => isActionableForPickup(i, {
      claimed: claimed.has(i.number),
      label: opts.label,
      assignee,
      intakeMode,
      sliceMergedParents,
      openIssues: open,
      claimedNumbers: claimed
    }));
    const candidates = sortIssuesForPickup(matching);
    let raced = 0;
    for (const cand of candidates) {
      try {
        await ctx.client.claimIssue(ctx.creds.org, ctx.project.projectId, cand.number, {
          repo,
          agent,
          ttlMinutes: opts.ttl ? parseInt(opts.ttl, 10) : undefined
        });
      } catch (e) {
        if (e instanceof ClaimConflictError) {
          raced++;
          continue;
        }
        console.warn(`Claim failed for #${cand.number} (skipping): ${e.message}`);
        continue;
      }
      const issueData = ghIssueView(repo, cand.number);
      const t = await loadTriage(ctx, repo, cand.number);
      printIssueContext(issueData, t.triage, repo, ctx.project, opts, t.unavailable, healed.length ? { healed } : {});
      return;
    }
    const reason = raced === candidates.length && raced > 0 ? "all_candidates_raced" : "no_actionable_issues";
    emit(opts, { issue: null, reason, ...healed.length ? { healed } : {} }, () => console.log(reason === "all_candidates_raced" ? `⏳ All ${raced} candidate(s) were claimed by other agents this tick — retry next tick.` : "✅ No actionable issues — every open issue is claimed or filtered out."), { pretty: true });
    process.exit(4);
  }));
  issue.command("done <number>").description("Release an issue (signal only)").option("--reason <reason>", "Why you're releasing it (e.g. blocked, finished)").option("--repo <fullname>", "Override target repo").option("--json", "Output JSON").option("--yaml", "Output YAML").action(runAction(async (numberStr, opts) => {
    const ctx = await loadCtx(program2);
    const { number, repo } = resolveTarget(ctx, numberStr, opts);
    const reason = opts.reason ?? "";
    await ctx.client.signal(ctx.creds.org, ctx.project.projectId, "issues", number, "release-claim", { repo, reason });
    emit(opts, { number, released: true, reason }, () => console.log(`Released #${number}.`));
  }));
  issue.command("escalate <number>").description("Hand an issue to a human: label needs-human + comment why. Keeps the work lock so the loop skips it this run.").option("--reason <reason>", "Why it's blocked / what a human must decide", "").option("--category <key>", `Why this class of work is gated on a human — appends the standard rationale. One of: ${Object.keys(ESCALATION_CATEGORIES).join(", ")}`).option("--owner <login>", "Accountable human named on the comment (default: signoff-owner config, else the issue author)").option("--update", "Edit the loop's latest \uD83D\uDEA7 escalation comment in place instead of stacking a new one").option("--force", "Skip the reason lint (open question without recommendation / not self-contained / no action section)").option("--repo <fullname>", "Override target repo").option("--keep-in-progress", "Keep the \uD83E\uDD16 in-progress label (default: swap it for needs-human)").option("--release", "Also release the ShipFlow claim (default: keep it so the loop won't re-pick it this run)").option("--for-pr <number>", "The PR whose inbox row owed this escalation — stamps the permanent once-key. Use WITH --once-reason (issue #488)").option("--once-reason <token>", `The escalate-once reason from the inbox row (\`escalateOnceReason\`). One of: ${ESCALATE_ONCE_REASONS.join(", ")}`).option("--json", "Output JSON").option("--yaml", "Output YAML").action(runAction(async (numberStr, opts) => {
    const reason = (opts.reason ?? "").trim();
    if (opts.category && !(opts.category in ESCALATION_CATEGORIES)) {
      console.error(`Unknown escalation category "${opts.category}" — valid: ${Object.keys(ESCALATION_CATEGORIES).join(", ")}`);
      process.exit(1);
    }
    const once = parseEscalateOnceKey(opts.forPr, opts.onceReason);
    if (once instanceof Error) {
      console.error(once.message);
      process.exit(1);
    }
    if (once && opts.update) {
      console.error("--update cannot carry an escalate-once key: an escalate-once row gets exactly one escalation, ever, and it must arrive as a new comment a human is notified of (issue #488). Drop --update on an `escalateOnce` row.");
      process.exit(1);
    }
    if (!opts.force) {
      const problems = lintEscalationReason(reason);
      if (problems.length) {
        console.error("Escalation reason failed lint — fix the reason (or pass --force):");
        for (const p of problems)
          console.error(`  • ${p}`);
        process.exit(1);
      }
    }
    const ctx = await loadCtx(program2);
    const { number, repo } = resolveTarget(ctx, numberStr, opts);
    const owner = normalizeOwner(opts.owner ?? resolveSignoffOwner() ?? ghIssueAuthor(repo, number));
    let body;
    try {
      body = formatEscalationBody(reason, { category: opts.category, owner, once, repo });
    } catch (e) {
      console.error(e.message);
      process.exit(1);
    }
    if (!opts.update && !once && !opts.force) {
      const labelsNow = ghIssueView(repo, number).labels.map((l) => l.name);
      if (labelsNow.includes(NEEDS_HUMAN_LABEL)) {
        const live = findLatestEscalationComment(ghIssueComments(repo, number));
        if (live) {
          throw new UsageError(`#${number} already has a live \uD83D\uDEA7 escalation (comment ${live.id}) and the ${NEEDS_HUMAN_LABEL} label is still on — ` + "re-escalate with --update so the human sees ONE current ask (message-style.md: one live escalation per issue), or --force to stack a second banner deliberately.");
        }
      }
    }
    let precedent;
    let disclosure;
    let surfaced = false;
    if (opts.category && !opts.update) {
      try {
        precedent = await ctx.client.matchPrecedent(ctx.creds.org, ctx.project.projectId, {
          category: opts.category,
          reason,
          repo,
          issue: number,
          ...once ? { surfaceOnly: true } : {}
        });
        if (!once && precedent?.outcome === "apply" && precedent.precedent) {
          disclosure = formatPrecedentDisclosure(precedent);
        } else if (precedent && precedent.precedent && (precedent.outcome === "suggest" || precedent.outcome === "reconfirm" || Boolean(once) && precedent.outcome === "apply")) {
          body = `${body}

${formatPrecedentSuggestion(precedent)}`;
          surfaced = true;
        }
      } catch {
        precedent = undefined;
        disclosure = undefined;
        surfaced = false;
      }
    }
    if (!once && precedent?.outcome === "apply" && precedent.precedent && disclosure !== undefined) {
      ghIssueComment(repo, number, disclosure);
      emit(opts, {
        number,
        escalated: false,
        autoResolved: true,
        reason,
        category: opts.category ?? null,
        once: once ?? null,
        precedent: { outcome: precedent.outcome, answer: precedent.precedent.answer, sourceIssue: precedent.precedent.sourceIssue }
      }, () => console.log(`\uD83D\uDD01 #${number} auto-resolved from your #${precedent.precedent.sourceIssue} decision — disclosure posted, reply \`undo\` to reverse.`));
      return;
    }
    ghEnsureLabel(repo, NEEDS_HUMAN_LABEL, "d93f0b", "ShipFlow loop needs a human to decide");
    ghIssueAddLabels(repo, number, [NEEDS_HUMAN_LABEL]);
    if (!opts.keepInProgress)
      ghIssueRemoveLabel(repo, number, IN_PROGRESS_LABEL);
    let updated = false;
    if (opts.update) {
      const existing = findLatestEscalationComment(ghIssueComments(repo, number));
      if (existing) {
        ghUpdateIssueComment(existing.id, preserveEscalateOnceMarkers(body, existing.body));
        updated = true;
      }
    }
    if (!updated)
      ghIssueComment(repo, number, body);
    let released = false;
    if (opts.release) {
      released = await signalBestEffort(ctx, "issues", number, "release-claim", { repo, reason: `escalated: ${reason}` }, "Escalated, but the release signal failed");
    }
    emit(opts, {
      number,
      escalated: true,
      label: NEEDS_HUMAN_LABEL,
      released,
      reason,
      owner: owner ?? null,
      category: opts.category ?? null,
      updated,
      once: once ?? null,
      precedent: surfaced ? { outcome: precedent.outcome, sourceIssue: precedent.precedent.sourceIssue, answer: precedent.precedent.answer } : null
    }, () => console.log(`\uD83D\uDEA7 #${number} escalated${updated ? " (existing \uD83D\uDEA7 comment updated)" : ""} → labelled "${NEEDS_HUMAN_LABEL}"${owner ? `, owner @${owner}` : ""}${surfaced ? ", precedent on file surfaced" : ""}${released ? " and claim released" : " (claim kept — loop skips it this run)"}.`));
  }));
  const collectDecisions = (v, prev) => prev.concat([v]);
  issue.command("judge <number>").description(`Upsert the Judge block at the TOP of the issue body — ≤4 lines a human reads to decide: state, PR/blocker, the replies to type, impact (issue #969). Idempotent; "since" survives while the state is unchanged. States: ${JUDGE_STATES.join(" | ")}.`).requiredOption("--state <state>", `One of ${JUDGE_STATES.join(", ")}`).option("--pr <number>", "The PR carrying the fix (required for state=review)").option("--pr-status <text>", 'PR standing in ≤8 words: "green (CI 2/2, scan clean)", "approved", "CI red"').option("--blocker <text>", 'What stops it and who owns that: "feature-map gate → #965". For state=blocked without it, the ⏳ waiting-on chain is walked and rendered: "#1548 → #1544 → waits on you"').option("--fan-out", 'state=waiting: count the open ⏳ waiting-on issues that transitively wait on this one and show "unblocks N issues" in the header').option("--decide <reply>", 'Repeatable. A reply the human can type + its consequence: "1: done → loop re-reviews" (≥1 required for state=waiting)', collectDecisions, []).option("--impact <text>", "What it costs if nobody acts (default: hoisted from the body's **Impact** line)").option("--progress <0-5>", "Override the pipeline meter (default derived: claimed 1 · PR open 3 · approved 4 · merged 5)").option("--since <iso>", "When the current state began (default: kept from the existing block while the state is unchanged, else now)").option("--repo <fullname>", "Override target repo").option("--dry-run", "Render and report without editing the issue").option("--json", "Output JSON").action(runAction(async (numberStr, opts) => {
    const ctx = await loadCtx(program2);
    const { number, repo } = resolveTarget(ctx, numberStr, opts);
    if (!isJudgeState(opts.state))
      throw new UsageError(`--state must be one of ${JUDGE_STATES.join(", ")} (got ${JSON.stringify(opts.state)})`);
    const pr = opts.pr != null ? parseInt(opts.pr, 10) : undefined;
    if (opts.pr != null && (!Number.isFinite(pr) || pr <= 0))
      throw new UsageError(`--pr must be a PR number (got ${JSON.stringify(opts.pr)})`);
    const progress = opts.progress != null ? parseInt(opts.progress, 10) : undefined;
    if (opts.progress != null && (!Number.isFinite(progress) || progress < 0 || progress > 5))
      throw new UsageError(`--progress must be 0–5 (got ${JSON.stringify(opts.progress)})`);
    const current = ghIssueView(repo, number);
    const existing = parseJudgeBlock(current.body ?? "");
    if (opts.since != null && Number.isNaN(Date.parse(opts.since)))
      throw new UsageError(`--since must be an ISO timestamp (got ${JSON.stringify(opts.since)})`);
    const since = opts.since != null ? new Date(opts.since).toISOString() : existing && existing.state === opts.state ? existing.since : new Date().toISOString();
    const toChainIssue = (n, view) => ({
      number: n,
      title: view.title,
      state: /closed/i.test(view.state) ? "closed" : "open",
      labels: view.labels.map((l) => l.name),
      body: view.body,
      comments: ghIssueComments(repo, n).map((c) => ({ body: c.body, viewerDidAuthor: !!c.viewerDidAuthor }))
    });
    const fetchIssue = (n) => {
      try {
        return toChainIssue(n, n === number ? current : ghIssueView(repo, n));
      } catch {
        return null;
      }
    };
    let blocker = opts.blocker;
    let chain = null;
    if (opts.state === "blocked" && !blocker?.trim()) {
      const walked = walkWaitingChain(number, repo, fetchIssue);
      if (walked.hops.length > 1 || walked.crossRepo) {
        chain = renderChain(walked, firstDecideReply(walked.rootIssue?.body));
        blocker = chain;
      }
    }
    let unblocks;
    if (opts.fanOut && opts.state === "waiting") {
      const waiting = ghIssueList(repo, "open", 100, undefined, WAITING_ON_LABEL).filter((i) => i.number !== number).map((i) => toChainIssue(i.number, i));
      unblocks = fanOut(number, repo, waiting, toChainIssue(number, current));
    }
    const spec = {
      state: opts.state,
      since,
      pr,
      prStatus: opts.prStatus,
      blocker,
      decisions: opts.decide,
      impact: opts.impact ?? extractImpact(current.body ?? ""),
      progress,
      acceptance: extractAcceptance(current.body ?? ""),
      unblocks
    };
    const problems = validateJudgeSpec(spec);
    if (problems.length)
      throw new UsageError(`Judge block refused:
- ${problems.join(`
- `)}`);
    const block = renderJudgeBlock(spec);
    const body = upsertJudgeBlock(current.body ?? "", block);
    if (!opts.dryRun)
      ghIssueEditBody(repo, number, body);
    const lines = linesToAction(body);
    emit(opts, { number, state: spec.state, since, pr: pr ?? null, decisions: spec.decisions.length, chain, unblocks: unblocks ?? null, acceptance: spec.acceptance, linesToAction: lines, updated: existing != null, dryRun: !!opts.dryRun, block }, () => console.log(`${opts.dryRun ? "(dry-run) " : ""}Judge block ${existing ? "updated" : "added"} on #${number}: state=${spec.state}, lines-to-action ${lines < 0 ? "none" : lines}.

${block}`));
  }));
  issue.command("brief <number>").description("Post or refresh the ONE live loop comment on an issue (intake brief / 'Unknowns & assumptions'). A second run edits the same comment in place and folds the previous text under History — the thread never grows a second intake table (issue #969).").requiredOption("--body-file <path>", "Markdown body; '-' reads stdin").option("--repo <fullname>", "Override target repo").option("--json", "Output JSON").action(runAction(async (numberStr, opts) => {
    const ctx = await loadCtx(program2);
    const { number, repo } = resolveTarget(ctx, numberStr, opts);
    const brief = readFileSync3(opts.bodyFile === "-" ? 0 : opts.bodyFile, "utf8").trim();
    if (!brief)
      throw new UsageError("--body-file is empty");
    const existing = findLatestIntakeComment(ghIssueComments(repo, number));
    const body = renderIntakeBody(brief, existing?.body);
    if (existing)
      ghUpdateIssueComment(existing.id, body);
    else
      ghIssueComment(repo, number, body);
    emit(opts, { number, updated: existing != null, commentId: existing?.id ?? null }, () => console.log(`Intake brief ${existing ? "updated in place (previous text folded under History)" : "posted"} on #${number}.`));
  }));
  issue.command("wait <number>").description("Park an issue on a dependency: label ⏳ waiting-on + comment. Unlike escalate, no human is needed — issue next skips it while the dependency is open and re-admits it automatically when the dependency merges/closes.").option("--on <ref>", "The blocking issue/PR: #123, 123, owner/repo#123, or a GitHub issue/PR URL").option("--reason <reason>", "One line on why this waits", "").option("--repo <fullname>", "Override target repo").option("--keep-in-progress", "Keep the \uD83E\uDD16 in-progress label (default: swap it for ⏳ waiting-on)").option("--json", "Output JSON").option("--yaml", "Output YAML").action(runAction(async (numberStr, opts) => {
    if (!opts.on?.trim()) {
      console.error("--on <ref> is required — the dependency this issue waits for (#123, owner/repo#123, or a GitHub URL).");
      process.exit(1);
    }
    const ctx = await loadCtx(program2);
    const { number, repo } = resolveTarget(ctx, numberStr, opts);
    const dep = parseDependencyRef(opts.on, repo);
    if (!dep) {
      console.error(`Could not parse --on ${JSON.stringify(opts.on)} — use #123, 123, owner/repo#123, or a GitHub issue/PR URL.`);
      process.exit(1);
    }
    if (dep.repo === repo && dep.number === number) {
      console.error(`#${number} cannot wait on itself.`);
      process.exit(1);
    }
    if (ghIssueOrPrState(dep.repo, dep.number) === "closed") {
      console.error(`Dependency ${dep.repo}#${dep.number} is already closed — nothing to wait for; work the issue instead.`);
      process.exit(1);
    }
    const reason = (opts.reason ?? "").trim();
    const depLabel = dep.repo === repo ? `#${dep.number}` : `${dep.repo}#${dep.number}`;
    const body = [
      `⏳ **Waiting on ${depLabel}**${reason ? ` — ${reason}` : ""}`,
      "",
      "The loop skips this issue while the dependency is open and **re-admits it automatically** once the dependency merges or closes. No human action needed.",
      "",
      formatWaitingOnMarker(dep)
    ].join(`
`);
    ghEnsureLabel(repo, WAITING_ON_LABEL, "fbca04", "Blocked by another issue/PR — the ShipFlow loop re-checks automatically");
    ghIssueAddLabels(repo, number, [WAITING_ON_LABEL]);
    if (!opts.keepInProgress)
      ghIssueRemoveLabel(repo, number, IN_PROGRESS_LABEL);
    ghIssueComment(repo, number, body);
    const released = await signalBestEffort(ctx, "issues", number, "release-claim", { repo, reason: `waiting on ${dep.repo}#${dep.number}` }, "Parked as waiting, but the release signal failed");
    emit(opts, { number, waiting: true, label: WAITING_ON_LABEL, on: `${dep.repo}#${dep.number}`, released, reason }, () => console.log(`⏳ #${number} waiting on ${depLabel} — labelled "${WAITING_ON_LABEL}"${released ? ", claim released" : ""}; the loop re-admits it when the dependency closes.`));
  }));
  issue.command("evidence <number>").description("Attach testing evidence. Screenshots must show the fix: --before AND --after pairs, one per changed surface, named with --label — or --actual alone when filing a bug that has no fix yet (reporter thread + a PR comment, or the issue if no --pr)").option("--before <path...>", "Screenshot(s) BEFORE the fix — before[i] pairs with after[i]").option("--after <path...>", "Screenshot(s) AFTER the fix — one per --before").option("--actual <path...>", "Screenshot(s) of the BROKEN state for a bug report — legal alone (no fix exists yet, so there is nothing to pair); can't be combined with --before/--after").option("--label <text...>", 'Name for each pair, by position (e.g. --label "Mode row" "Grade ladder") — a multi-surface change attaches one labeled pair per surface').option("--before-caption <text...>", "Caption for each --before shot, by position — describes what THAT shot shows (keeps a summary from over-claiming)").option("--after-caption <text...>", "Caption for each --after shot, by position").option("--actual-caption <text...>", "Caption for each --actual shot, by position — what THAT shot shows is broken").option("--image-caption <text...>", "Caption for each supplementary --image/--file, by position").option("--touched <name...>", "Touched feature names — the evidence gallery renders a red gap card for each one without a matching proof pair").option("--image <path...>", "Extra screenshot file(s) — prefer --before/--after").option("--file <path...>", "Supplementary media — a screen recording (mp4/mov/webm) or extra files").option("--pr <n>", "Related PR number — when set, the evidence comment lands on the PR instead of the issue").option("--preview-url <url>", "Testing site URL").option("--caption <text>", "Short note shown with the evidence").option("--repo <fullname>", "Override target repo").option("--json", "Output JSON").option("--yaml", "Output YAML").action(runAction(async (numberStr, opts) => {
    const before = opts.before ?? [];
    const after = opts.after ?? [];
    const actual = opts.actual ?? [];
    const labels = opts.label ?? [];
    const beforeCaptions = opts.beforeCaption ?? [];
    const afterCaptions = opts.afterCaption ?? [];
    const actualCaptions = opts.actualCaption ?? [];
    const imageCaptions = opts.imageCaption ?? [];
    const misc = [...opts.file ?? [], ...opts.image ?? []];
    const selErr = validateEvidenceSelection(before, after, misc, labels, beforeCaptions, afterCaptions, imageCaptions, actual, actualCaptions);
    if (selErr) {
      console.error(selErr);
      process.exit(1);
    }
    const ctx = await loadCtx(program2);
    const { number, repo } = resolveTarget(ctx, numberStr, opts);
    const toImg = (p) => ({ filename: basename2(p), data: new Uint8Array(readFileSync3(p)) });
    const res = await ctx.client.attachEvidence(ctx.creds.org, ctx.project.projectId, number, {
      repo,
      pr: opts.pr ? parseInt(opts.pr, 10) : undefined,
      previewUrl: opts.previewUrl,
      caption: opts.caption,
      before: before.map(toImg),
      after: after.map(toImg),
      labels,
      beforeCaptions,
      afterCaptions,
      imageCaptions,
      touched: opts.touched ?? [],
      actual: actual.map(toImg),
      actualCaptions,
      images: misc.map(toImg)
    });
    const threadVerdict = evidenceThreadVerdict(res.threadStatus, res.threadNotified, res.threadError);
    const commentVerdict = evidenceCommentVerdict(res.commentStatus, res.githubCommented, !!res.prCommented, res.commentError);
    emit(opts, res, () => {
      const where = [];
      if (res.threadNotified)
        where.push(threadVerdict.partial ? "reporter thread (PARTIAL)" : "reporter thread");
      if (res.prCommented)
        where.push("PR comment");
      if (res.githubCommented)
        where.push("GitHub issue comment");
      console.log(`\uD83E\uDDEA Evidence delivered to: ${where.join(" + ") || "nowhere (check server logs)"}`);
      for (const u of res.threadImageUrls ?? [])
        console.log(`  ${u}`);
      if (!threadVerdict.isError)
        console.log(threadVerdict.note);
      if (!commentVerdict.isError)
        console.log(commentVerdict.note);
    }, { pretty: true });
    const loud = [threadVerdict, commentVerdict].filter((v) => v.isError);
    if (loud.length) {
      for (const v of loud)
        console.error(v.note);
      process.exit(loud[0].exitCode);
    }
  }));
}
function printIssueContext(issueData, triage, repo, project, fmt = {}, triageUnavailable = false, extra = {}) {
  emit(fmt, { issue: issueData, triage, triageUnavailable, project, ...extra }, () => printIssueContextHuman(issueData, triage, repo, triageUnavailable), { pretty: true });
}
function printIssueContextHuman(issueData, triage, repo, triageUnavailable) {
  console.log(`Issue #${issueData.number} — "${issueData.title}"`);
  const facts = [
    ["Repo", repo],
    ["State", issueData.state],
    ["Labels", issueData.labels.map((l) => l.name).join(", ") || "(none)"]
  ];
  if (triage?.priority)
    facts.push(["Priority", triage.priority]);
  if (triage?.relatedFeatures?.length)
    facts.push(["Features", triage.relatedFeatures.join(", ")]);
  console.log("");
  for (const l of renderTable(["Fact", "Value"], facts))
    console.log(l);
  console.log("");
  console.log(issueData.body || "(no body)");
  if (triage) {
    console.log(`
── ShipFlow context ──`);
    if (triage.relatedFiles?.length) {
      console.log("Files likely involved:");
      triage.relatedFiles.slice(0, 10).forEach((f) => console.log(`  - [ ] ${f}`));
    }
    if (triage.relatedCommits?.length) {
      console.log("Recent commits in same area:");
      triage.relatedCommits.slice(0, 5).forEach((c) => console.log(`  ${c}`));
    }
  } else if (triageUnavailable) {
    console.log(`
${TRIAGE_UNAVAILABLE_MARKER}`);
  }
}
async function readStdin() {
  const chunks = [];
  for await (const c of process.stdin)
    chunks.push(c);
  return Buffer.concat(chunks).toString("utf-8");
}

// src/commands/intake.ts
init_helpers();
init_gh();
var INTAKE_CLEAR_LIST_LIMIT = 1000;
function hasApprovalLabel2(issue) {
  return issue.labels.some((l) => l.name === NEEDS_REPORTER_APPROVAL_LABEL);
}
function clearLabelledIssue(repo, number, login) {
  ghIssueComment(repo, number, renderIntakeClearAudit(login));
  ghIssueRemoveLabel(repo, number, NEEDS_REPORTER_APPROVAL_LABEL);
}
function parseIssueNumber(raw) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0 || String(n) !== raw.trim()) {
    throw new UsageError(`intake clear: invalid --issue ${raw}`);
  }
  return n;
}
function printReport(r) {
  const clearedList = r.cleared.length ? `: ${r.cleared.map((n) => `#${n}`).join(", ")}` : "";
  console.log(`Cleared ${r.cleared.length} issue(s)${clearedList}.`);
  if (r.skipped.length) {
    console.log(`Skipped ${r.skipped.length} (not labelled): ${r.skipped.map((n) => `#${n}`).join(", ")}`);
  }
  if (r.failed.length) {
    console.log(`Failed ${r.failed.length}: ${r.failed.map((f) => `#${f.number} — ${f.error}`).join("; ")}`);
  }
}
function registerIntakeCommand(program2) {
  const intake = program2.command("intake").description("Intake-gate maintainer actions");
  intake.command("clear").description("Remove needs-reporter-approval (audit comment, then label)").option("--all", "Clear every open issue carrying the label").option("--issue <n>", "Clear one issue by number").option("--repo <fullname>", "Repo (default: the active project's)").option("--json", "Output JSON").option("--yaml", "Output YAML").action(runAction(async (opts) => {
    const hasAll = !!opts.all;
    const hasIssue = opts.issue !== undefined && opts.issue !== "";
    if (hasAll === hasIssue) {
      throw new UsageError("intake clear: specify exactly one of --all or --issue <n>");
    }
    const issueNumber = hasIssue ? parseIssueNumber(opts.issue) : null;
    const ctx = await loadGhCtx(program2, opts.repo);
    const repo = ctx.project.repoFullName;
    const login = ghCurrentLogin().trim();
    if (!login) {
      throw new UsageError("intake clear: gh login unresolved (`gh api user` failed) — refusing an unattributed audit; check `gh auth status`");
    }
    const report = { cleared: [], skipped: [], failed: [] };
    const targets = [];
    if (hasAll) {
      const listed = ghIssueList(repo, "open", INTAKE_CLEAR_LIST_LIMIT, undefined, NEEDS_REPORTER_APPROVAL_LABEL);
      if (listed.length === INTAKE_CLEAR_LIST_LIMIT) {
        console.warn(`intake clear: listing window is full (${INTAKE_CLEAR_LIST_LIMIT}) — re-run --all if labels remain`);
      }
      targets.push(...listed);
    } else {
      try {
        targets.push(ghIssueView(repo, issueNumber));
      } catch (e) {
        throw new UsageError(`intake clear: could not read #${issueNumber}: ${e.message}`);
      }
    }
    for (const issue of targets) {
      if (!hasApprovalLabel2(issue)) {
        report.skipped.push(issue.number);
        continue;
      }
      try {
        clearLabelledIssue(repo, issue.number, login);
        report.cleared.push(issue.number);
      } catch (e) {
        report.failed.push({ number: issue.number, error: e instanceof Error ? e.message : String(e) });
      }
    }
    emit(opts, report, () => printReport(report), { pretty: true });
    if (report.failed.length)
      process.exit(1);
  }));
}

// src/commands/inbox.ts
init_config();
init_gh();
init_pr_state();
init_escalation_format();
init_helpers();

// src/commands/pr.ts
init_config();
init_gh();
import { execSync as execSync5 } from "node:child_process";
import { closeSync, existsSync as existsSync3, lstatSync, openSync, readFileSync as readFileSync4, rmSync, statSync as statSync2, writeFileSync as writeFileSync3 } from "node:fs";
import { createHash as createHash2 } from "node:crypto";
import { join as join4 } from "node:path";
import { hostname as hostname3 } from "node:os";

// src/review-contract-data.ts
var REVIEW_CONTRACT = {
  $comment: "Canonical review contract (epic #96, Option B): the single source of truth for constants BOTH reviewers share — the Go server's pr_review runner and the TS CLI's loop review packet. Mirrors: apps/renaissshipflow-server/internal/reviewcontract/review-contract.json (go:embed, byte-identical) and apps/renaissshipflow-cli/src/review-contract-data.ts (generated). Regenerate mirrors with `node scripts/sync-review-contract.mjs`; parity tests on both sides fail on drift. Noise lists are the UNION of the two pre-contract lists (never narrow), split into scopes: the lists under `noise` are shared review-filter noise; `noise.featuremapOnly` is feature-map-only (tracked, reviewable source the loop packet must keep showing). Verdict vocabularies are carried per side AS-IS — reconciliation is a later slice. `ownsTestVectors` pins the directory-boundary `owns` matcher, which stays implemented per language. `merge` is the (path, line, fingerprint) identity + Jaccard threshold the fingerprint helpers share (issue #508); the algorithm is implemented per language like `owns`.",
  version: 1,
  budgets: {
    $comment: "perFileDiffCap/packetTotalCap bound each reviewer's diff; briefCap bounds the linked-issue spec + PR body (acceptance criteria sit at the BOTTOM of issue bodies — a tight cap silently drops the checklist).",
    perFileDiffCap: 24000,
    packetTotalCap: 150000,
    briefCap: 8000
  },
  noise: {
    $comment: "Paths excluded from review diffs / the feature map, in two scopes. The lists directly under `noise` are SHARED review-filter noise: excluded from both reviewers' diffs and from the feature map. `featuremapOnly` entries are excluded from the feature map only — and, transitively, from the Go server's review filter, which shares featuremap.IsNoisePath (its pre-contract behavior) — but they are tracked, reviewable source the loop packet MUST keep showing (pre-contract it was the only reviewer that saw them). Matching: substrings whole-segment (issue #651): a token (trailing / stripped) is noise ONLY where it equals a full path segment or run of segments (Go matchesNoiseSegment / CLI isNoiseDiffPath: `/`+p+`/` contains `/`+token+`/`), so nested matches keep working while sibling names that merely CONTAIN a token do not — nested src/out/x stays noise, about/ is not (TS case-insensitively, Go case-sensitively — each side keeps its pre-contract semantics). suffixes: trailing patterns filepath.Ext can't express. basenames: exact filenames (matched against the path's base name, never as a suffix). extensions: final-dot file extensions.",
    substrings: [
      "node_modules/",
      ".git/",
      "vendor/",
      "dist/",
      "build/",
      ".next/",
      "__pycache__/",
      ".mypy_cache/",
      ".tox/",
      ".venv/",
      ".cache/",
      "coverage/",
      ".nyc_output/",
      ".turbo/",
      "__generated__/",
      "__snapshots__/",
      "__mocks__/",
      "storybook-static/",
      ".pytest_cache/",
      ".gradle/",
      "DerivedData/",
      "Pods/",
      "target/",
      ".rush/",
      "out/",
      ".swc/",
      ".expo/"
    ],
    suffixes: [
      ".pb.go",
      "_pb2.py",
      "_pb2_grpc.py",
      "_gen.go",
      "_generated.go",
      ".gen.go",
      ".generated.ts",
      ".generated.tsx",
      ".gen.ts",
      ".min.js",
      ".min.css",
      ".tsbuildinfo"
    ],
    basenames: [
      "package-lock.json",
      "bun.lockb"
    ],
    extensions: [
      ".map",
      ".lock",
      ".sum",
      ".png",
      ".jpg",
      ".jpeg",
      ".gif",
      ".ico",
      ".svg",
      ".woff",
      ".woff2",
      ".ttf",
      ".eot",
      ".snap"
    ],
    featuremapOnly: {
      $comment: ".claude/ is tracked, reviewable source in this repo (63 files incl. plugin-shipped .claude/commands/shipflow-*.md and .claude/skills TS source) — noise for the feature map (and the server reviewer, per its pre-contract IsNoisePath), never for the loop packet.",
      substrings: [
        ".claude/"
      ]
    }
  },
  verdicts: {
    $comment: "Carried AS-IS per side; unifying the vocabulary is a later slice of #96. Do not gate on the server enum — the server review is advisory.",
    loop: ["approve", "comment", "request_changes", "reject"],
    server: ["looks_good", "comment", "request_changes"]
  },
  judgedDecisions: {
    $comment: "Rules for every LLM-judged auto-decision (issue #209). evalAccept is the default acceptance expression cmd/revieweval evaluates when a -baseline is supplied: grammar `<metric> >= <signed>pt [AND <clause>...] over >= <N> runs`, metrics precision|recall|f1, signed deltas in percentage points on mean-of-runs; ACCEPT when every clause holds on the mean deltas with >=N runs per side, PARK when some clause fails in every candidate run, anything else is GRAY-ZONE and escalates to a human. swapAndAggregate: a single-pass LLM judge is position-biased — order consistency is <=65% single-pass (MT-Bench) — so every judged decision MUST run the judge twice with the candidate list order swapped/reversed and count only verdicts BOTH passes agree on; disagreements are reported, never silently resolved.",
    evalAccept: "recall>=+2pt AND precision>=-1pt over >=2 runs",
    swapAndAggregate: true
  },
  severities: ["critical", "high", "medium", "low"],
  defaultSeverity: "medium",
  severityBadges: {
    $comment: "Severity → rendered badge, byte-identical across BOTH reviewers (server runner_pr_review.go severityBadge ↔ CLI review-contract.ts severityBadge). Keys are exactly `severities`; a blank or unknown severity renders defaultSeverity's badge (parity-tested both sides). Badges are Gemini Code Assist's exact hosted SVGs (user request: identical visual language across both reviewers) — GitHub-only surfaces; chat renderers must keep using text severity words.",
    critical: "![critical](https://www.gstatic.com/codereviewagent/critical.svg)",
    high: "![high](https://www.gstatic.com/codereviewagent/high-priority.svg)",
    medium: "![medium](https://www.gstatic.com/codereviewagent/medium-priority.svg)",
    low: "![low](https://www.gstatic.com/codereviewagent/low-priority.svg)"
  },
  effortTags: {
    $comment: 'Effort → rendered fix-size tag on the finding badge line, byte-identical across BOTH reviewers (server runner_pr_review.go effortTag ↔ CLI review-contract.ts effortTag). A blank or unknown effort renders "" (no tag) — NOT a default tag, unlike severityBadges which falls back to defaultSeverity (parity-tested both sides). Kept in the same CodeRabbit-style visual language as the severity badges.',
    quick: " · ⚡ quick fix",
    involved: " · \uD83D\uDD28 involved"
  },
  merge: {
    $comment: "Finding/coverage-row identity for multi-pass merge (issue #378, promoted #508). Key is (path, line, fingerprint): fingerprint is the issue/item text after lowercase + every non-letter/digit rune → space + whitespace collapsed (Go unicode.IsLetter/IsDigit ↔ TS \\p{L}/\\p{N}). Two rows at the same (path, line) collapse when fingerprints are exact or their token-set Jaccard is >= fingerprintSimilarityThreshold. First-seen text wins and severity escalates to the max seen — those policy rules live in the server's mergeReviewPasses, not here. Threshold 0.6 is the #378 value; #509 owns any eval-driven retune. normalizeTestVectors / similarTestVectors pin the helpers across both languages (similar vectors are already-normalized fingerprints). The CLI carries the helpers for parity this slice; it does not auto-collapse post-review findings.",
    key: ["path", "line", "fingerprint"],
    fingerprintSimilarityThreshold: 0.6,
    normalizeTestVectors: [
      { $comment: "lowercase, punctuation/backticks → space, whitespace collapsed", in: "Nil-pointer  deref, when `list` is EMPTY!", want: "nil pointer deref when list is empty" },
      { in: "  plain text  ", want: "plain text" },
      { in: "...", want: "" },
      { in: "", want: "" },
      { $comment: "non-ASCII letter: Go unicode.IsLetter ↔ TS \\p{L}", in: "Café: naïve 123!", want: "café naïve 123" }
    ],
    similarTestVectors: [
      { $comment: "already-normalized fingerprints; Jaccard is |A∩B|/|A∪B| over token SETS", a: "a b c", b: "a b c", jaccard: 1, similar: true },
      { a: "a b", b: "c d", jaccard: 0, similar: false },
      { a: "", b: "", jaccard: 1, similar: true },
      { a: "a", b: "", jaccard: 0, similar: false },
      { $comment: "{a b c} vs {a b d}: 2/4 = 0.5 — below the 0.6 collapse threshold", a: "a b c", b: "a b d", jaccard: 0.5, similar: false },
      { $comment: "{a b c d e} vs {a b c d}: 4/5 = 0.8 — above the threshold", a: "a b c d e", b: "a b c d", jaccard: 0.8, similar: true }
    ]
  },
  ownsTestVectors: [
    { $comment: "Directory-boundary match: a prefix owns itself and everything under it, never a sibling that merely shares the string.", prefix: "src/app/admin", path: "src/app/admin", owns: true },
    { prefix: "src/app/admin", path: "src/app/admin/page.tsx", owns: true },
    { prefix: "src/app/admin", path: "src/app/admin/nested/deep/file.ts", owns: true },
    { prefix: "src/app/admin", path: "src/app/admin-shop/page.tsx", owns: false },
    { prefix: "src/app/admin", path: "src/app/adminx", owns: false },
    { prefix: "./src/app/admin", path: "src/app/admin/page.tsx", owns: true },
    { prefix: "src/app/admin/", path: "src/app/admin/page.tsx", owns: true },
    { prefix: "src/app/admin/", path: "src/app/admin/", owns: true },
    { prefix: "src/app/admin/", path: "src/app/admin", owns: false },
    { prefix: "", path: "src/anything.ts", owns: false },
    { prefix: "./", path: "src/anything.ts", owns: false },
    { prefix: "apps", path: "apps/renaissshipflow-cli/src/index.ts", owns: true },
    { prefix: "src/app/admin", path: "src", owns: false },
    { prefix: "app", path: "src/app/x.ts", owns: false },
    { prefix: "SRC/App", path: "src/app/x.ts", owns: false }
  ],
  noiseTestVectors: [
    { $comment: "Whole-segment match for `noise.substrings` (issue #651): a token (trailing / stripped) is noise ONLY where it equals a full path segment, so nested matches keep working while sibling names that merely CONTAIN a token do not. `scope: featuremapOnly` vectors come from noise.featuremapOnly.substrings: noise for the feature map and the Go server's review filter, NEVER for the loop packet (isNoiseDiffPath must return false). Vectors avoid case-divergent paths — TS lowercases, Go does not (deliberate, per the noise $comment).", path: "app/about/page.tsx", noise: false },
    { path: "src/layout/Header.tsx", noise: false },
    { path: "app/checkout/page.tsx", noise: false },
    { path: "app/logout/route.ts", noise: false },
    { path: "src/workout/plan.ts", noise: false },
    { path: "packages/retarget/index.ts", noise: false },
    { path: "mobile-target/src/main.rs", noise: false },
    { path: "scripts/rebuild/run.sh", noise: false },
    { path: "tools/prebuild/step.js", noise: false },
    { path: "src/main.go", noise: false },
    { path: "out/static/foo.html", noise: true },
    { path: "src/node_modules/x.js", noise: true },
    { path: "node_modules/foo/bar.js", noise: true },
    { path: "ios/Pods/lib/x.m", noise: true },
    { path: "build/bundle.js", noise: true },
    { path: "target/release/y.rs", noise: true },
    { path: "apps/.claude/commands/shipflow-loop.md", noise: true, scope: "featuremapOnly" },
    { path: ".claude/skills/foo.md", noise: true, scope: "featuremapOnly" }
  ]
};

// src/packet.ts
init_shipflow_contract_data();
init_project();
init_pr_state();
var PACKET_PER_FILE_CAP = REVIEW_CONTRACT.budgets.perFileDiffCap;
var PACKET_TOTAL_CAP = REVIEW_CONTRACT.budgets.packetTotalCap;
var PACKET_BRIEF_CAP = REVIEW_CONTRACT.budgets.briefCap;
var NOISE_SUBSTRINGS = REVIEW_CONTRACT.noise.substrings.map((s) => s.toLowerCase());
var NOISE_SUFFIXES = [
  ...REVIEW_CONTRACT.noise.suffixes,
  ...REVIEW_CONTRACT.noise.extensions
].map((s) => s.toLowerCase());
var NOISE_BASENAMES = REVIEW_CONTRACT.noise.basenames.map((s) => s.toLowerCase());
function matchesNoiseSegment(p, s) {
  const token = s.replace(/^\/+|\/+$/g, "");
  if (token === "")
    return false;
  return `/${p}/`.includes(`/${token}/`);
}
function isNoiseDiffPath(path) {
  const p = path.replace(/\\/g, "/").replace(/^\.\//, "").toLowerCase();
  const base = p.slice(p.lastIndexOf("/") + 1);
  return NOISE_BASENAMES.includes(base) || NOISE_SUBSTRINGS.some((s) => matchesNoiseSegment(p, s)) || NOISE_SUFFIXES.some((s) => p.endsWith(s));
}
function splitUnifiedDiff(diff) {
  const sections = [];
  const lines = diff.split(`
`);
  let current = null;
  for (const line of lines) {
    const m = /^diff --git a\/(.+) b\/(.+)$/.exec(line);
    if (m) {
      if (current)
        sections.push(current);
      current = { path: m[2], body: line };
    } else if (current) {
      current.body += `
` + line;
    }
  }
  if (current)
    sections.push(current);
  return sections;
}
function filterDiffForPacket(diff) {
  const out = [];
  let shown = 0;
  let omittedNoise = 0;
  let omittedBudget = 0;
  let truncatedFiles = 0;
  let total = 0;
  for (const s of splitUnifiedDiff(diff)) {
    if (isNoiseDiffPath(s.path)) {
      omittedNoise++;
      continue;
    }
    if (total >= PACKET_TOTAL_CAP) {
      omittedBudget++;
      continue;
    }
    let body = s.body;
    if (body.length > PACKET_PER_FILE_CAP) {
      body = body.slice(0, PACKET_PER_FILE_CAP) + `
… (file diff truncated)`;
      truncatedFiles++;
    }
    out.push(body);
    total += body.length;
    shown++;
  }
  return { text: out.join(`
`), shown, omittedNoise, omittedBudget, truncatedFiles };
}
var CI_NOTHING_VALIDATED = "nothing was validated — every reported check is NEUTRAL/SKIPPED";
function summarizeChecks(checks) {
  let passing = 0, failing = 0, pending = 0;
  const failingChecks = [];
  for (const c of checks) {
    const state = ciStateOf([c]);
    if (state === "passing")
      passing++;
    else if (state === "failing") {
      failing++;
      failingChecks.push(c.name ?? "unnamed");
    } else if (state === "pending")
      pending++;
  }
  return { passing, failing, pending, failingChecks, reported: checks.length > 0 };
}
function formatCiSummary(ci) {
  if (!ci.reported)
    return "no checks reported";
  if (ci.passing === 0 && ci.failing === 0 && ci.pending === 0)
    return CI_NOTHING_VALIDATED;
  return `${ci.passing} passing · ${ci.failing} failing · ${ci.pending} pending${ci.failingChecks.length ? ` — failing: ${ci.failingChecks.join(", ")}` : ""}`;
}
function extractEvidenceLines(comments) {
  const lines = [];
  for (const c of comments) {
    const body = c.body ?? "";
    if (!body.includes("Test evidence") && !/health \d+/.test(body))
      continue;
    for (const line of body.split(`
`)) {
      if (line.includes("Test evidence") || /health \d+→\d+|health \d+ ?→/.test(line) || line.startsWith("Verified:") || line.trimStart().startsWith("- Verified")) {
        lines.push(line.trim());
      }
    }
  }
  return lines.slice(0, 12);
}
function matchGlobSegment(pattern, s) {
  let p = 0, i = 0, star = -1, mark = 0;
  while (i < s.length) {
    if (p < pattern.length && (pattern[p] === "?" || pattern[p] === s[i])) {
      p++;
      i++;
    } else if (p < pattern.length && pattern[p] === "*") {
      star = p++;
      mark = i;
    } else if (star >= 0) {
      p = star + 1;
      i = ++mark;
    } else
      return false;
  }
  while (p < pattern.length && pattern[p] === "*")
    p++;
  return p === pattern.length;
}
function matchGlobSegments(pat, seg) {
  const p = [];
  for (const s of pat)
    if (!(s === "**" && p[p.length - 1] === "**"))
      p.push(s);
  const width = seg.length + 1;
  const failed = new Set;
  const walk = (pi, si) => {
    const key = pi * width + si;
    if (failed.has(key))
      return false;
    let a = pi, b = si;
    while (a < p.length) {
      if (p[a] === "**") {
        if (a !== pi) {
          if (walk(a, b))
            return true;
          failed.add(key);
          return false;
        }
        for (let k = b;k <= seg.length; k++)
          if (walk(a + 1, k))
            return true;
        failed.add(key);
        return false;
      }
      if (b >= seg.length || !matchGlobSegment(p[a], seg[b])) {
        failed.add(key);
        return false;
      }
      a++;
      b++;
    }
    if (b !== seg.length) {
      failed.add(key);
      return false;
    }
    return true;
  };
  return walk(0, 0);
}
function ownsPath(featurePath, filePath) {
  const pattern = featurePath.replace(/^\.\//, "");
  if (!pattern)
    return false;
  if (!/[*?]/.test(pattern)) {
    return filePath === pattern || filePath.startsWith(pattern.endsWith("/") ? pattern : pattern + "/");
  }
  return matchGlobSegments(pattern.split("/"), filePath.split("/"));
}
function pathCandidates(path, repo) {
  const out = [path];
  if (!repo)
    return out;
  const parts = repo.split("/");
  const shortName = parts[parts.length - 1];
  if (shortName)
    out.push(`${shortName}/${path}`);
  if (parts.length === 2 && parts[0])
    out.push(`${repo}/${path}`);
  return out;
}
var CATCH_ALL_PROBE_PATH = "__shipflow_catch_all_probe__/__no_such_file__.probe";
function isCatchAllFeaturePath(featurePath, repo) {
  return pathCandidates(CATCH_ALL_PROBE_PATH, repo).some((c) => ownsPath(featurePath, c));
}
function resolveFeatureMatch(diffPaths, features, repo) {
  const changed = diffPaths.filter((p) => !isNoiseDiffPath(p)).flatMap((p) => pathCandidates(p, repo));
  const touched = [];
  const catchAll = [];
  for (const f of features) {
    const owning = (f.paths ?? []).filter((fp) => changed.some((path) => ownsPath(fp, path)));
    if (!owning.length)
      continue;
    const name = f.name || f.key;
    touched.push(name);
    if (owning.every((fp) => isCatchAllFeaturePath(fp, repo)))
      catchAll.push(name);
  }
  return { touched, catchAll };
}
var FEATURE_MATCH_NULL_WARNING = "⚠️ Feature map matched NOTHING — the map has features and this diff has non-noise " + "files, but no feature path owns any changed path. `Features touched` is absent " + "because the MATCHER found nothing, not because the PR touches no feature: treat " + "per-feature evidence coverage as UNVERIFIED and suspect stale/mis-prefixed map paths.";
function featureMatchCatchAllWarning(catchAll) {
  return `⚠️ Feature map matched ONLY a catch-all entry (${catchAll.join(", ")}) — the map has ` + "features and this diff has non-noise files, but no NAMED feature path owns any " + "changed path. A catch-all matches every diff identically, so `Features touched` " + "identifies nothing: treat per-feature evidence coverage as UNVERIFIED and suspect " + "stale/mis-prefixed map paths.";
}
function featureMatchVerdict(features, diffPaths, match) {
  if (!features?.length || !diffPaths.some((p) => !isNoiseDiffPath(p)))
    return "matched";
  if (match.touched.length === 0)
    return "null";
  if (match.catchAll.length === match.touched.length)
    return "catch-all";
  return "matched";
}
function assessEvidenceCoverage(touched, comments, opts) {
  const evidenceItems = comments.filter((c) => {
    const body = c.body ?? "";
    return /^\s*🧪.*Test evidence/m.test(body) || /^\s*-?\s*\*{0,2}verified:/im.test(body);
  }).length;
  if (opts?.catchAllOnly && touched.length) {
    return {
      evidenceItems,
      warning: `⚠️ Per-feature evidence coverage UNVERIFIED — the only match is a catch-all map ` + `entry, so the ${evidenceItems} evidence item(s) here cannot be attributed to any ` + `named feature; the per-feature proof count is unknown, not satisfied.`
    };
  }
  if (touched.length <= 1 || evidenceItems >= touched.length) {
    return { evidenceItems, warning: null };
  }
  return {
    evidenceItems,
    warning: `⚠️ ${touched.length} features touched, ${evidenceItems} evidence item(s) — ` + `need ≥1 proof per feature on a multi-feature PR; treat each unproven feature ` + `as an unresolved thread (request_changes) unless every touched feature maps ` + `to a proof.`
  };
}
var DEVIATIONS_HEADING_ALIASES = [
  "deviations from brief",
  "deviations from the brief",
  "deviations"
];
var HEADING_TEXT = /^ {0,3}(#{1,6})\s+(.*)$/;
var BOLD_HEADING = /^ {0,3}\*\*(.+?)\*\*(.*)$/;
var BOLD_TRAILING_ANNOTATION = /^[—–\-/&:(]|^and\b/;
var BOLD_DEVIATIONS_HEADING_LEVEL = 2;
function headingLevel(line) {
  const m = HEADING_TEXT.exec(line);
  if (m)
    return m[1].length;
  if (boldDeviationsHeadingText(line) !== null)
    return BOLD_DEVIATIONS_HEADING_LEVEL;
  return null;
}
function normalizeHeading(s) {
  return s.toLowerCase().replace(/\s+/g, " ").replace(/^[^\p{L}\p{N}]+/u, "").replace(/[^\p{L}\p{N}]+$/u, "").trim();
}
var HEADING_ANNOTATION_SPLIT = /\s+[—–\-/&]\s+|:\s+|\s+and\s+|\s+\(/;
function isDeviationAliasText(text) {
  const norm = normalizeHeading(text);
  if (DEVIATIONS_HEADING_ALIASES.includes(norm))
    return true;
  const head = normalizeHeading(norm.split(HEADING_ANNOTATION_SPLIT)[0] ?? "");
  return DEVIATIONS_HEADING_ALIASES.includes(head);
}
function boldDeviationsHeadingText(line) {
  if (HEADING_TEXT.test(line))
    return null;
  const m = BOLD_HEADING.exec(line);
  if (!m)
    return null;
  const inner = m[1];
  const trailing = (m[2] ?? "").trim();
  if (trailing && !BOLD_TRAILING_ANNOTATION.test(trailing))
    return null;
  const text = trailing ? `${inner} ${trailing}` : inner;
  return isDeviationAliasText(text) ? text : null;
}
function isDeviationsHeading(line) {
  const m = HEADING_TEXT.exec(line);
  if (m)
    return isDeviationAliasText(m[2]);
  return boldDeviationsHeadingText(line) !== null;
}
function extractDeviations(prBody) {
  return findDeviationsSection(prBody.split(`
`))?.content ?? "";
}
function findDeviationsSection(lines) {
  for (let start = 0;start < lines.length; start++) {
    if (!isDeviationsHeading(lines[start]))
      continue;
    const openLevel = headingLevel(lines[start]) ?? 6;
    const section = [];
    let structured = false;
    let end = lines.length;
    for (let i = start + 1;i < lines.length; i++) {
      const level = headingLevel(lines[i]);
      if (level !== null) {
        if (level <= openLevel) {
          end = i;
          break;
        }
        const empty = section.join("").trim() === "";
        if (empty && openLevel >= 2)
          structured = true;
        else if (!structured) {
          end = i;
          break;
        }
      }
      section.push(lines[i]);
    }
    const content = section.join(`
`).trim();
    if (content)
      return { start, end, content };
  }
  return null;
}
function findNearMissDeviationHeadings(prBody) {
  const lines = prBody.split(`
`);
  const parsed = findDeviationsSection(lines);
  const out = [];
  for (let i = 0;i < lines.length; i++) {
    if (parsed && i >= parsed.start && i < parsed.end)
      continue;
    if (isDeviationsHeading(lines[i]))
      continue;
    const m = HEADING_TEXT.exec(lines[i]);
    if (!m)
      continue;
    if (normalizeHeading(m[2]).includes("deviation"))
      out.push(lines[i].trim());
  }
  return out;
}
var INTERPRETATION_NOTE_CALLOUT = /^[^\p{L}\n]*interpretation note/imu;
function hasExplicitInterpretationSignal(prBody) {
  if (!prBody)
    return false;
  if (prBody.includes(SHIPFLOW_CONTRACT.markers.interpretationNote))
    return true;
  return INTERPRETATION_NOTE_CALLOUT.test(prBody);
}
function hasInterpretationSignal(prBody) {
  if (!prBody)
    return false;
  if (prBody.includes(SHIPFLOW_CONTRACT.markers.interpretationNote))
    return true;
  if (INTERPRETATION_NOTE_CALLOUT.test(prBody))
    return true;
  if (extractDeviations(prBody))
    return true;
  return false;
}
var REVIEW_THREADS_UNAVAILABLE_MARKER = "⚠️ review threads UNAVAILABLE — unresolved count NOT determined";
function specUnavailableMarker(issueNumber) {
  return `⚠️ **Brief NOT loaded — issue #${issueNumber} could not be read.** The brief is ` + `UNAVAILABLE, not absent: do NOT judge this PR without it, and do NOT hold the missing ` + `brief against the author. Re-run the packet, or read the issue directly.`;
}
function buildReviewPacket(input) {
  const { pr, threads, diff, issue } = input;
  const b = [];
  b.push(`# Review packet — PR #${pr.number}: ${pr.title}`);
  const meta = [];
  if (pr.headRefName)
    meta.push(`${pr.headRefName} → ${pr.baseRefName ?? "?"}`);
  if (pr.isDraft)
    meta.push("DRAFT");
  if (pr.mergeable)
    meta.push(`mergeable: ${pr.mergeable}`);
  if (pr.labels?.length)
    meta.push(`labels: ${pr.labels.map((l) => l.name).join(", ")}`);
  b.push(meta.join(" · "));
  b.push(`
## Spec / acceptance brief`);
  if (issue) {
    b.push(`Issue #${issue.number} (${issue.linkKind}): ${issue.title}`);
    const body = (issue.body ?? "").trim();
    b.push(body.length > PACKET_BRIEF_CAP ? body.slice(0, PACKET_BRIEF_CAP) + `
… (brief truncated)` : body || "_(issue has no body)_");
  } else if (input.specUnavailable) {
    b.push(specUnavailableMarker(input.specUnavailable));
  } else if (input.specNotReadable) {
    b.push(specNotReadableIssueNote(input.specNotReadable.number, input.specNotReadable.repo));
  } else {
    b.push("⚠️ **No linked issue/brief found.** Do NOT infer the spec from the diff — " + "reviewing against a self-derived spec is a known silent failure. Flag the missing brief in your verdict.");
  }
  const prBody = (pr.body ?? "").trim();
  if (prBody) {
    b.push(`
## PR description`);
    b.push(prBody.length > PACKET_BRIEF_CAP ? prBody.slice(0, PACKET_BRIEF_CAP) + `
… (truncated)` : prBody);
  }
  const deviations = extractDeviations(pr.body ?? "");
  if (deviations) {
    b.push(`
## Deviations from brief`);
    b.push(deviations);
    b.push("_Verify each deviation: conservative? justified? does the spec still hold?_");
  }
  const nearMisses = findNearMissDeviationHeadings(pr.body ?? "");
  if (nearMisses.length) {
    b.push(`
## Deviation-like headings (not parsed)`);
    for (const h of nearMisses.slice(0, 5))
      b.push(`- \`${h}\``);
    b.push("_Display only — these did NOT feed the intent gate and block nothing. " + "If one is a real deviation log, ask the author to retitle it " + `(\`${DEVIATIONS_HEADING_ALIASES[0]}\`, any heading level)._`);
  }
  b.push(`
## CI`);
  b.push(formatCiSummary(summarizeChecks(pr.statusCheckRollup ?? [])));
  if (input.threadsUnavailable) {
    b.push(`
## External review threads (UNAVAILABLE)`);
    b.push(REVIEW_THREADS_UNAVAILABLE_MARKER);
    b.push("_The approve precondition (zero unresolved threads) could NOT be evaluated. " + "A gate that could not run is `request_changes`, never a footnote — re-run the packet, " + "or check with `renaiss-shipflow pr reviews <n>`._");
  } else {
    const unresolved = threads.filter((t) => !t.isResolved);
    b.push(`
## External review threads (unresolved: ${unresolved.length})`);
    if (unresolved.length === 0) {
      b.push("none");
    } else {
      for (const t of unresolved.slice(0, 20)) {
        const anchor = t.path ? `${t.path}${t.line ? `:${t.line}` : ""}` : "(top-level)";
        b.push(`- ${anchor} @${t.author || "unknown"} — ${t.body.replace(/\s+/g, " ").slice(0, 140)}`);
      }
    }
  }
  const evidence = extractEvidenceLines(pr.comments ?? []);
  const allDiffPaths = splitUnifiedDiff(diff).map((s) => s.path);
  const match = input.features?.length ? resolveFeatureMatch(allDiffPaths, input.features, input.repo) : { touched: [], catchAll: [] };
  const touchedAll = match.touched;
  const verdict = featureMatchVerdict(input.features, allDiffPaths, match);
  b.push(`
## Evidence / health`);
  if (input.featureMapSkipCause)
    b.push(featureMapSkippedWarning(input.featureMapSkipCause));
  else if (input.featureMapNotApplicable)
    b.push(featureMapNotApplicableNote(input.featureMapNotApplicable));
  if (input.features?.length) {
    const mapMarkerAlreadyShown = Boolean(input.featureMapSkipCause || input.featureMapNotApplicable);
    if (touchedAll.length) {
      const catchAllOnly = verdict === "catch-all" && !mapMarkerAlreadyShown;
      const suffix = catchAllOnly ? " — catch-all only, no named feature" : "";
      b.push(`Features touched (${touchedAll.length}): ${touchedAll.join(", ")}${suffix}`);
      if (catchAllOnly)
        b.push(featureMatchCatchAllWarning(match.catchAll));
      const cov = assessEvidenceCoverage(touchedAll, pr.comments ?? [], { catchAllOnly });
      if (cov.warning)
        b.push(cov.warning);
    } else if (!mapMarkerAlreadyShown && verdict === "null") {
      b.push(FEATURE_MATCH_NULL_WARNING);
    }
  }
  b.push(evidence.length ? evidence.join(`
`) : "no evidence caption posted");
  if (input.features?.length) {
    const touchedNames = new Set(touchedAll);
    if (touchedNames.size) {
      const touched = input.features.filter((f) => touchedNames.has(f.name || f.key)).slice(0, 12);
      b.push(`
## Features (relevant slice)`);
      for (const f of touched) {
        const layer = f.layer ? ` [${f.layer}]` : "";
        const tp = f.testPriority ? ` · test_priority: ${f.testPriority}` : "";
        const desc = f.description ? ` — ${f.description}` : "";
        b.push(`- ${f.name || f.key}${layer}${tp}${desc}`);
      }
      const layers = new Set(touched.map((f) => f.layer).filter(Boolean));
      const neighbors = input.features.filter((f) => !touchedNames.has(f.name || f.key) && f.layer && layers.has(f.layer)).map((f) => f.name || f.key).slice(0, 15);
      if (neighbors.length)
        b.push(`Same-layer neighbors: ${neighbors.join(", ")}`);
      b.push("_This slice replaces the full map for most reviews — run `renaiss-shipflow features --json` only if you need beyond it._");
    }
  }
  const filtered = filterDiffForPacket(diff);
  b.push(`
## Diff (${filtered.shown} file(s) shown` + (filtered.omittedNoise ? `, ${filtered.omittedNoise} noise file(s) omitted` : "") + (filtered.omittedBudget ? `, ${filtered.omittedBudget} over budget` : "") + (filtered.truncatedFiles ? `, ${filtered.truncatedFiles} truncated` : "") + ")");
  b.push("```diff");
  b.push(filtered.text);
  b.push("```");
  return b.join(`
`);
}
function buildReviewPacketData(input) {
  const { pr, threads, diff, issue } = input;
  const trunc = (s, cap) => s.length > cap ? { text: s.slice(0, cap), truncated: true } : { text: s, truncated: false };
  let spec;
  if (issue) {
    const t = trunc((issue.body ?? "").trim(), PACKET_BRIEF_CAP);
    spec = { linked: true, issue: { number: issue.number, linkKind: issue.linkKind, title: issue.title, body: t.text, truncated: t.truncated } };
  } else if (input.specUnavailable) {
    spec = {
      linked: false,
      unavailable: true,
      issueNumber: input.specUnavailable,
      warning: specUnavailableMarker(input.specUnavailable)
    };
  } else if (input.specNotReadable) {
    spec = {
      linked: false,
      notReadable: true,
      issueNumber: input.specNotReadable.number,
      notReadableNote: specNotReadableIssueNote(input.specNotReadable.number, input.specNotReadable.repo)
    };
  } else {
    spec = {
      linked: false,
      warning: "No linked issue/brief found — do NOT infer the spec from the diff; flag the missing brief in your verdict."
    };
  }
  const prBody = (pr.body ?? "").trim();
  const prDescription = prBody ? trunc(prBody, PACKET_BRIEF_CAP) : undefined;
  const deviations = extractDeviations(pr.body ?? "") || undefined;
  const unresolved = threads.filter((t) => !t.isResolved);
  const reviewThreads = input.threadsUnavailable ? { unresolved: null, unavailable: true, items: [] } : {
    unresolved: unresolved.length,
    items: unresolved.slice(0, 20).map((t) => ({
      path: t.path || null,
      line: t.line ?? null,
      author: t.author || "unknown",
      body: t.body.replace(/\s+/g, " ").slice(0, 140)
    }))
  };
  const evidence = { lines: extractEvidenceLines(pr.comments ?? []) };
  if (input.featureMapSkipCause)
    evidence.featureMapSkipped = featureMapSkippedWarning(input.featureMapSkipCause);
  else if (input.featureMapNotApplicable)
    evidence.featureMapNotApplicable = featureMapNotApplicableNote(input.featureMapNotApplicable);
  let features;
  if (input.features?.length) {
    const diffPaths = splitUnifiedDiff(diff).map((s) => s.path);
    const match = resolveFeatureMatch(diffPaths, input.features, input.repo);
    const touchedNames = match.touched;
    const mapMarkerAlreadyShown = Boolean(input.featureMapSkipCause || input.featureMapNotApplicable);
    const verdict = mapMarkerAlreadyShown ? "matched" : featureMatchVerdict(input.features, diffPaths, match);
    if (verdict === "null")
      evidence.featureMatchWarning = FEATURE_MATCH_NULL_WARNING;
    else if (verdict === "catch-all") {
      evidence.featureMatchWarning = featureMatchCatchAllWarning(match.catchAll);
      evidence.featuresTouchedCatchAllOnly = true;
    }
    if (touchedNames.length) {
      evidence.featuresTouched = touchedNames;
      evidence.coverageWarning = assessEvidenceCoverage(touchedNames, pr.comments ?? [], { catchAllOnly: verdict === "catch-all" }).warning;
      const touchedSet = new Set(touchedNames);
      const touched = input.features.filter((f) => touchedSet.has(f.name || f.key)).slice(0, 12);
      const layers = new Set(touched.map((f) => f.layer).filter(Boolean));
      const sameLayerNeighbors = input.features.filter((f) => !touchedSet.has(f.name || f.key) && f.layer && layers.has(f.layer)).map((f) => f.name || f.key).slice(0, 15);
      features = {
        touched: touched.map((f) => ({ name: f.name || f.key, layer: f.layer, testPriority: f.testPriority, description: f.description })),
        sameLayerNeighbors
      };
    }
  }
  return {
    pr: {
      number: pr.number,
      title: pr.title,
      headRefName: pr.headRefName,
      baseRefName: pr.baseRefName,
      isDraft: pr.isDraft,
      mergeable: pr.mergeable,
      labels: (pr.labels ?? []).map((l) => l.name)
    },
    spec,
    prDescription,
    deviations,
    ci: summarizeChecks(pr.statusCheckRollup ?? []),
    reviewThreads,
    evidence,
    features,
    diff: filterDiffForPacket(diff)
  };
}

// src/review-contract.ts
init_shipflow_contract_data();
var LOOP_VERDICTS = REVIEW_CONTRACT.verdicts.loop;
var SEVERITIES = REVIEW_CONTRACT.severities;
var DEFAULT_SEVERITY = REVIEW_CONTRACT.defaultSeverity;
function severityBadge(severity) {
  const badges = REVIEW_CONTRACT.severityBadges;
  return badges[(severity ?? "").trim().toLowerCase()] ?? badges[REVIEW_CONTRACT.defaultSeverity];
}
function effortTag(effort) {
  const tags = REVIEW_CONTRACT.effortTags;
  const key = (effort ?? "").trim().toLowerCase();
  if (key.startsWith("$"))
    return "";
  return tags[key] ?? "";
}
var FINGERPRINT_SIMILARITY_THRESHOLD = REVIEW_CONTRACT.merge.fingerprintSimilarityThreshold;
function verdictHeader(verdict) {
  switch (verdict) {
    case "approve":
      return "**✅ APPROVE — ShipFlow review**";
    case "request_changes":
      return "**\uD83D\uDD34 CHANGES REQUESTED — ShipFlow review**";
    case "reject":
      return "**⛔ REJECT — ShipFlow review**";
    default:
      return "**\uD83D\uDCAC ShipFlow review — comments**";
  }
}
function findingsIssueGuardError(findings) {
  if (!Array.isArray(findings))
    return;
  for (let i = 0;i < findings.length; i++) {
    const f = findings[i];
    const issue = f != null && typeof f === "object" ? f.issue : undefined;
    if (typeof issue !== "string" || !issue.trim()) {
      return `findings[${i}].issue must be a non-empty string`;
    }
  }
  return;
}
var REVIEW_MARKER = SHIPFLOW_CONTRACT.markers.loopReview;
function beforeAfterCell(s) {
  return s.replace(/\s+/g, " ").trim().replace(/\|/g, "\\|");
}
function renderBeforeAfter(before, after) {
  const b = beforeAfterCell(before ?? "");
  const a = beforeAfterCell(after ?? "");
  if (!b || !a)
    return "";
  return `| Before | After |
| --- | --- |
| ${b} | ${a} |`;
}
function renderFindingBody(f) {
  let b = `${severityBadge(f.severity)}${effortTag(f.effort)} ${f.issue}`;
  const ba = renderBeforeAfter(f.before, f.after);
  if (ba)
    b += `

${ba}`;
  if (f.why?.trim())
    b += `

${f.why.trim()}`;
  if (f.fix?.trim())
    b += `

**Fix:** ${f.fix.trim()}`;
  const sug = (f.suggestion ?? "").replace(/\n+$/, "");
  const code = (f.code ?? "").replace(/\n+$/, "");
  if (sug.trim())
    b += `
\`\`\`suggestion
${sug}
\`\`\``;
  else if (code.trim())
    b += `
\`\`\`
${code}
\`\`\``;
  return `${b}

${REVIEW_MARKER}`;
}
function normPath(p) {
  return String(p ?? "").replace(/\\/g, "/").replace(/^\.\//, "").trim();
}
var HUNK_RE = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/;
var FILE_RE = /^\+\+\+ b\/(.+)$/;
function diffAnchors(diff) {
  const out = new Map;
  let path = "";
  let ln = 0;
  for (const raw of diff.split(/\r?\n/)) {
    const fm = FILE_RE.exec(raw);
    if (fm) {
      path = normPath(fm[1]);
      ln = 0;
      continue;
    }
    const hm = HUNK_RE.exec(raw);
    if (hm) {
      ln = parseInt(hm[1], 10);
      continue;
    }
    if (!path || ln === 0)
      continue;
    if (raw.startsWith("-"))
      continue;
    if (raw.startsWith("+") || raw.startsWith(" ")) {
      if (!out.has(path))
        out.set(path, new Set);
      out.get(path).add(ln);
      ln++;
    }
  }
  return out;
}
function startLineOf(f) {
  const v = f.startLine ?? f.start_line;
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
}
function diffHunks(diff) {
  const out = new Map;
  let path = "";
  let ln = 0;
  let hunk = 0;
  for (const raw of diff.split(/\r?\n/)) {
    const fm = FILE_RE.exec(raw);
    if (fm) {
      path = normPath(fm[1]);
      ln = 0;
      continue;
    }
    const hm = HUNK_RE.exec(raw);
    if (hm) {
      ln = parseInt(hm[1], 10);
      hunk++;
      continue;
    }
    if (!path || ln === 0)
      continue;
    if (raw.startsWith("-"))
      continue;
    if (raw.startsWith("+") || raw.startsWith(" ")) {
      if (!out.has(path))
        out.set(path, new Map);
      out.get(path).set(ln, hunk);
      ln++;
    }
  }
  return out;
}
function findingSpan(f, anchors, hunks) {
  const start = startLineOf(f);
  if (start <= 0 || start >= f.line)
    return [0, f.line];
  const p = normPath(f.path);
  if (!anchors.get(p)?.has(start))
    return [0, f.line];
  const h = hunks?.get(p);
  if (h && h.get(start) !== h.get(f.line))
    return [0, f.line];
  return [start, f.line];
}
function splitAnchorable(findings, anchors) {
  const inline = [];
  const body = [];
  for (const f of findings) {
    if (f.line > 0 && anchors.get(normPath(f.path))?.has(f.line))
      inline.push(f);
    else
      body.push(f);
  }
  return { inline, body };
}
function buildReviewPayload(opts) {
  const { inline, body: unanchored } = splitAnchorable(opts.findings, opts.anchors);
  const lines = [verdictHeader(opts.verdict)];
  if (opts.summary.trim())
    lines.push("", opts.summary.trim());
  if (unanchored.length) {
    lines.push("", "**Further findings (outside the annotated diff lines):**");
    for (const f of unanchored) {
      const p = normPath(f.path);
      const fs = startLineOf(f);
      const anchor = f.line > 0 ? fs > 0 && fs < f.line ? `${p}:${fs}-${f.line}` : `${p}:${f.line}` : p;
      const fbLines = renderFindingBody(f).split(`

` + REVIEW_MARKER)[0].split(`
`);
      lines.push(`- \`${anchor}\` — ${fbLines[0]}`);
      for (let i = 1;i < fbLines.length; i++)
        lines.push(fbLines[i] ? `  ${fbLines[i]}` : "");
    }
  }
  lines.push("", REVIEW_MARKER);
  return {
    event: "COMMENT",
    body: lines.join(`
`),
    comments: inline.map((f) => {
      const [start, line] = findingSpan(f, opts.anchors, opts.hunks);
      const c = { path: normPath(f.path), line, side: "RIGHT", body: renderFindingBody(f) };
      if (start > 0) {
        c.start_line = start;
        c.start_side = "RIGHT";
      }
      return c;
    })
  };
}

// src/commands/pr.ts
init_shipflow_contract_data();
init_sh();
init_pr_state();
init_helpers();
init_project();
var LINT_MODES = ["warn", "strict"];
function lintNearMissDeviationHeadings(body) {
  const hits = findNearMissDeviationHeadings(body);
  if (hits.length === 0)
    return [];
  const quoted = hits.map((h) => `\`${h}\``).join(", ");
  return [
    `body has near-miss Deviations heading(s) ${quoted} — retitle to a canonical \`${DEVIATIONS_HEADING_ALIASES[0]}\` heading (any level) or drop the section; a near-miss does not feed the intent gate and is not rewritten`
  ];
}
var APPROVED_LABEL = SHIPFLOW_CONTRACT.labels.names.shipflowApproved;
var REPORTER_REVIEW_LABEL = SHIPFLOW_CONTRACT.labels.names.needsReporterReview;
function evalIntentGate(repo, number, prView, reads = {}) {
  const hasLabel = (prView.labels ?? []).some((l) => l.name === REPORTER_REVIEW_LABEL);
  const mode = (reads.mode ?? resolveIntentGateMode)();
  const signal = mode === "trusted" ? hasExplicitInterpretationSignal(prView.body ?? "") : hasInterpretationSignal(prView.body ?? "");
  let everCleared = false;
  if (signal && !hasLabel) {
    try {
      const evidence = (reads.clearance ?? (() => ghIntentGateClearance(repo, number, REPORTER_REVIEW_LABEL)))();
      everCleared = intentGateEverCleared(evidence);
    } catch {
      everCleared = false;
    }
  }
  const facts = { signal, hasLabel, everCleared };
  return evaluatedIntentGate(facts);
}
function evaluatedIntentGate(facts) {
  return {
    ...intentGate(facts),
    blockedBy: facts.hasLabel ? "label" : intentGateBlockedBy(facts)
  };
}
var FRESH_PROBE_BACKOFF_MS = 3000;
async function freshProbeIntentGate(first, reads) {
  if (!first.applyLabel)
    return first;
  await reads.sleep(FRESH_PROBE_BACKOFF_MS);
  let hasLabel = false;
  try {
    hasLabel = reads.hasLabel();
  } catch {
    hasLabel = false;
  }
  let everCleared = false;
  try {
    everCleared = intentGateEverCleared(reads.clearance());
  } catch {
    everCleared = false;
  }
  const facts = { signal: true, hasLabel, everCleared };
  return evaluatedIntentGate(facts);
}
var liveIntentGateFreshReads = (repo, number) => ({
  hasLabel: () => (ghPRView(repo, number).labels ?? []).some((l) => l.name === REPORTER_REVIEW_LABEL),
  clearance: () => ghIntentGateClearance(repo, number, REPORTER_REVIEW_LABEL),
  sleep: (ms) => new Promise((r) => setTimeout(r, ms))
});
function tsvCol2ToCheck(raw) {
  const s = raw.trim().toLowerCase();
  if (!s || s === "skipping" || s === "skipped" || s === "-")
    return { conclusion: "SKIPPED" };
  if (s === "neutral")
    return { conclusion: "NEUTRAL" };
  if (s === "pass" || s === "success")
    return { conclusion: "SUCCESS" };
  if (s === "fail" || s === "failure")
    return { conclusion: "FAILURE" };
  if (s === "error")
    return { conclusion: "ERROR" };
  if (s === "cancelled" || s === "canceled")
    return { conclusion: "CANCELLED" };
  if (s === "timed_out")
    return { conclusion: "TIMED_OUT" };
  if (s === "action_required")
    return { conclusion: "ACTION_REQUIRED" };
  return { status: "IN_PROGRESS" };
}
function classifyChecks(lines) {
  const state = ciStateOf(lines.map((l) => tsvCol2ToCheck(l.split("\t")[1] ?? "")));
  if (state === "failing")
    return "fail";
  if (state === "passing")
    return "pass";
  return "pending";
}
function renderPrNoteBody(body, reworkFrom) {
  const parts = [body, "", SHIPFLOW_CONTRACT.markers.loop];
  if (reworkFrom)
    parts.push(renderReworkFromMarker(reworkFrom));
  return parts.join(`
`);
}
function stampLoopReview(body) {
  const marker = SHIPFLOW_CONTRACT.markers.loopReview;
  return body.includes(marker) ? body : `${body.replace(/\s+$/, "")}

${marker}`;
}
function renderIntentGateNotice(opts) {
  const blockedBy = opts?.blockedBy ?? (opts?.hasLabel === false ? "signal" : "label");
  const tokens = SHIPFLOW_CONTRACT.intentGate.confirmationTokens.map((t) => `\`${t}\``).join(", ");
  return [
    `${INTENT_GATE_NOTICE_HEADLINE} (\`${REPORTER_REVIEW_LABEL}\`)`,
    "",
    "This PR's body carries an interpretation or deviation nobody has confirmed, so ShipFlow will not auto-merge it.",
    "",
    "| To do this | Reply with |",
    "| --- | --- |",
    `| **Release the gate** | a reply that is ONLY one of: ${tokens} — and nothing else |`,
    "| **Correct the reading** | anything else — the gate STAYS on and the loop reworks the PR |",
    "| **Approve with a caveat** | also leaves the gate ON: `yes but …` is a correction, not consent |",
    "| **Say thanks / add a note** | send it as a SEPARATE comment — a token with anything under it does not release |",
    `| **Override by hand** | ${INTENT_GATE_OVERRIDE_DETAIL[blockedBy]} |`,
    "",
    `${SHIPFLOW_CONTRACT.intentGate.releaseHint}`,
    "",
    SHIPFLOW_CONTRACT.markers.loop
  ].join(`
`);
}
var GATE_ARM_BLOCKER = "intent gate could not be armed";
function armIntentGate(repo, number, gate, w) {
  const applyLabel = gate.applyLabel;
  let applyNotice = applyLabel;
  let lookupFailure = "";
  if (!applyLabel && gate.blocked) {
    try {
      applyNotice = !w.noticePosted(repo, number);
    } catch (e) {
      applyNotice = false;
      lookupFailure = `notice lookup: ${e instanceof Error ? e.message : String(e)} — notice presence unverified, not re-posted (retried next pass)`;
    }
  }
  if (!applyLabel && !applyNotice) {
    return lookupFailure ? { attempted: true, armed: false, blockers: [GATE_ARM_BLOCKER], gateArmError: lookupFailure } : { attempted: false, armed: true, blockers: [] };
  }
  const failures = [];
  const guard = (what, fn) => {
    try {
      fn();
      return true;
    } catch (e) {
      failures.push(`${what}: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    }
  };
  let labelOnIssue = true;
  if (applyLabel) {
    guard("ensure label", () => w.ensureLabel(repo, number));
    labelOnIssue = guard("add label", () => w.addLabel(repo, number));
  }
  let noticeOk = !applyNotice;
  if (applyNotice) {
    if (labelOnIssue)
      noticeOk = guard("post notice", () => w.postNotice(repo, number));
    else
      failures.push("post notice: deferred — label not applied, so a confirmation reply would be ignored");
  }
  const armed = labelOnIssue && noticeOk;
  if (armed)
    return { attempted: true, armed: true, blockers: [] };
  return {
    attempted: true,
    armed: false,
    blockers: [GATE_ARM_BLOCKER],
    gateArmError: failures.join("; ")
  };
}
function hasIntentGateNotice(comments) {
  return comments.some((c) => c.viewerDidAuthor && c.body.includes(INTENT_GATE_NOTICE_HEADLINE));
}
var liveIntentGateWriters = {
  ensureLabel: (repo) => ghEnsureLabel(repo, REPORTER_REVIEW_LABEL, labelColorFor(REPORTER_REVIEW_LABEL), "An unconfirmed worker interpretation/deviation awaiting the issue reporter's confirmation"),
  addLabel: (repo, number) => ghIssueAddLabels(repo, number, [REPORTER_REVIEW_LABEL]),
  postNotice: (repo, number) => ghIssueComment(repo, number, renderIntentGateNotice()),
  noticePosted: (repo, number) => hasIntentGateNotice(ghIssueComments(repo, number))
};
var SCAN_EXIT = 9;
function isExecutableInstructionPath(lower) {
  return lower === "claude.md" || lower.endsWith("/claude.md") || lower === "agents.md" || lower.endsWith("/agents.md") || lower.startsWith("skills/") || lower.includes("/skills/") || lower.includes(".claude/commands/") || lower.includes(".claude/agents/") || lower === ".github/copilot-instructions.md" || lower.endsWith("/.github/copilot-instructions.md");
}
function isDocsPath(p) {
  const lower = p.toLowerCase();
  if (isExecutableInstructionPath(lower))
    return false;
  if (lower.endsWith(".md"))
    return true;
  return lower.endsWith(".html") && p.startsWith("docs/");
}
function isDocsOnlyChange(paths) {
  return paths.length > 0 && paths.every(isDocsPath);
}
function evaluateScanAttestation(i) {
  const base = { files: i.attested, expected: i.expected, degraded: [] };
  if (!i.approving)
    return { ...base, ok: true, verdict: "not-required", reason: "" };
  if (i.reportExists === false) {
    return { ...base, ok: false, verdict: "no-report", reason: "--scan-report names nothing readable (missing, empty, or not a regular file) — an unreadable report is not proof a scan ran" };
  }
  if (i.attestedDigest && i.actualDigest && i.attestedDigest !== i.actualDigest) {
    return { ...base, ok: false, verdict: "digest-mismatch", reason: `--scan-digest ${i.attestedDigest.slice(0, 12)}… is not this PR's diff (GitHub serves ${i.actualDigest.slice(0, 12)}…) — the scan read other bytes, or the PR moved after the capture; re-capture with \`pr diff\` and re-scan` };
  }
  if (isDocsOnlyChange(i.paths))
    return { ...base, ok: true, verdict: "not-required", reason: "" };
  if (i.attested === null) {
    return { ...base, ok: false, verdict: "missing", reason: "no --scan-files attestation — an approval must state how many files the security scan read" };
  }
  if (i.attested === 0) {
    return { ...base, ok: false, verdict: "zero", reason: "the security scan read 0 files — an empty capture cannot produce a CLEAN verdict (capture the diff with `pr diff <n> --out <path>` and scan THAT file)" };
  }
  if (i.expected === null) {
    return {
      ...base,
      ok: false,
      verdict: "undetermined",
      reason: `GitHub's changed-file count could not be read, so the attestation of ${i.attested} file(s) could not be verified — a gate that could not run is request_changes, never a footnote`,
      degraded: [GITHUB_REST_DEP]
    };
  }
  if (i.attested !== i.expected) {
    return { ...base, ok: false, verdict: "mismatch", reason: `scan attestation mismatch — attested ${i.attested} file(s), GitHub reports ${i.expected} changed file(s); the scan did not read this PR's diff` };
  }
  if (i.reportExists == null) {
    return { ...base, ok: false, verdict: "no-report", reason: "no --scan-report — an approval must carry the scan's written findings (write them to a file, then pass it)" };
  }
  if (!i.attestedDigest) {
    return { ...base, ok: false, verdict: "no-digest", reason: "no --scan-digest — the file count alone is copyable off GitHub without opening a diff; pass the `sha256=` that `pr diff` printed for the capture you scanned" };
  }
  if (i.actualDigest === null) {
    return {
      ...base,
      ok: false,
      verdict: "undetermined",
      reason: "this PR's diff could not be re-read, so --scan-digest could not be checked — a gate that could not run is request_changes, never a footnote",
      degraded: [GITHUB_REST_DEP]
    };
  }
  return { ...base, ok: true, verdict: "verified", reason: "" };
}
function stripScanLines(text) {
  const isScanLine = (l) => {
    const t = l.trim();
    return t.startsWith("\uD83D\uDD0D Security scan:") || t.startsWith("Security scan:") || t.startsWith("⛔ Security scan attestation");
  };
  return text.split(`
`).filter((l) => !isScanLine(l)).join(`
`).replace(/\n{3,}/g, `

`).trim();
}
function scanAttestationLine(a, reportPath, digest) {
  const hidden = [];
  if (reportPath)
    hidden.push(`report: ${reportPath}`);
  if (digest && digest.length > 12)
    hidden.push(`sha256: ${digest}`);
  const report = hidden.length ? ` <!-- ${hidden.join(" · ")} -->` : "";
  const bound = digest ? ` · diff sha256 \`${digest.slice(0, 12)}\`` : "";
  if (a.verdict === "not-required" && a.files !== null) {
    const census = a.expected === null ? " (GitHub's changed-file count could not be read)" : `, GitHub reports ${a.expected} changed`;
    return `\uD83D\uDD0D Security scan: **${a.files} file(s) scanned**${census} — recorded (not an approval, so the digest was not cross-checked)${bound}.${report}`;
  }
  if (a.verdict === "not-required")
    return `\uD83D\uDD0D Security scan: not required — no scan gate applies to this change (docs-only, or no approval recorded).`;
  if (a.ok)
    return `\uD83D\uDD0D Security scan: **${a.files} file(s) scanned**, GitHub reports ${a.expected} changed — attestation VERIFIED${bound}.${report}`;
  return `⛔ Security scan attestation FAILED (${a.verdict}): ${a.reason}${report}`;
}
function recordsScanLine(a, approving) {
  return approving || a.files !== null;
}
function parseScanFiles(raw) {
  if (raw === undefined)
    return null;
  const n = Number.parseInt(String(raw).trim(), 10);
  return Number.isFinite(n) && n >= 0 && String(n) === String(raw).trim() ? n : null;
}
function diffDigest(diff) {
  return createHash2("sha256").update(diff, "utf8").digest("hex");
}
function scanReportUsable(path) {
  if (path === undefined)
    return null;
  try {
    const st = statSync2(path);
    return st.isFile() && st.size > 0;
  } catch {
    return false;
  }
}
function prDiffDigestOrNull(repo, number) {
  try {
    return diffDigest(ghPRDiffText(repo, number));
  } catch {
    return null;
  }
}
function writeCapture(path, diff) {
  const st = lstatSync(path, { throwIfNoEntry: false });
  if (st && !st.isFile()) {
    throw new Error(`refusing to write the diff capture to ${path}: it exists and is not a regular file (symlink or directory) — pick another --out path`);
  }
  if (st)
    rmSync(path, { force: true });
  const fd = openSync(path, "wx", 384);
  try {
    writeFileSync3(fd, diff);
  } finally {
    closeSync(fd);
  }
}
function changedFilesOrNull(repo, number) {
  try {
    return { paths: ghPRChangedFiles(repo, number), unavailable: false };
  } catch (e) {
    console.warn(changedFilesUnavailableWarning(flattenCause(e)));
    return { paths: [], unavailable: true };
  }
}
function countDiffFiles(diff) {
  return (diff.match(/^diff --git /gm) ?? []).length;
}
function countDiffLines(diff) {
  if (diff === "")
    return 0;
  return diff.endsWith(`
`) ? diff.split(`
`).length - 1 : diff.split(`
`).length;
}
function unresolvedThreadsOrBlock(repo, number) {
  try {
    const all = ghReviewThreads(repo, number);
    return {
      count: reviewThreadCensus(all, "").unresolvedThreads,
      unavailable: false,
      settleReviews: all.map((t) => ({ author: t.author, submittedAt: t.submittedAt }))
    };
  } catch {
    return { count: 0, unavailable: true };
  }
}
function lastHeadAtOrBlock(repo, number) {
  try {
    return { lastHeadAt: ghPRLastHeadAt(repo, number), unavailable: false };
  } catch {
    return { lastHeadAt: null, unavailable: true };
  }
}
var defaultReviewSettleSleep = (ms) => new Promise((r) => setTimeout(r, ms));
var reviewSettleSleep = defaultReviewSettleSleep;
function isSettleBlocker(b) {
  return b === REVIEW_SETTLE_BLOCKER || b === REVIEW_SETTLE_UNAVAILABLE;
}
function allReadySweepExit(evaluated, merged) {
  return evaluated > 0 && merged === 0 ? 5 : 0;
}
function allReadySweepLine(evaluated, merged) {
  const body = `merged ${merged}/${evaluated} ready PR(s) oldest-first`;
  return merged < evaluated ? body : `✅ ${body}`;
}
async function releaseClaimsAfterAutomerge(ctx, repo, prNumber, prView) {
  const closed = linkedIssueNumbers(prView);
  for (const n of closed) {
    await signalBestEffort(ctx, "issues", n, "release-claim", { repo, reason: `merged via PR #${prNumber}` });
  }
  return closed;
}
async function automergeOnce(ctx, repo, number, opts) {
  const policy = (opts.policy?.trim() || undefined) ?? resolveMergePolicy();
  const staleHours = resolveStalePrHours();
  const me = ghCurrentLogin();
  const prView = ghPRView(repo, number);
  const threads = unresolvedThreadsOrBlock(repo, number);
  const unresolvedThreads = threads.count;
  const gate = await freshProbeIntentGate(evalIntentGate(repo, number, prView), liveIntentGateFreshReads(repo, number));
  const freshness = ghPRFreshness(repo, prView);
  const lastHead = lastHeadAtOrBlock(repo, number);
  const nowMs = Date.now();
  const lastHeadAt = lastHead.unavailable ? null : lastHead.lastHeadAt;
  const settleReviews = threads.settleReviews ?? [];
  const headSha = commitSha(prView.headRefOid);
  const decide = (head, at) => mergeDecision(prView, me, {
    policy,
    requireCi: resolveRequireCi(),
    staleHours,
    unresolvedThreads,
    intentBlocked: gate.blocked,
    intentBlockedBy: gate.blockedBy,
    behindBy: freshness.behindBy,
    freshnessUnresolvable: freshness.unresolvable,
    lastHeadAt: head,
    nowMs: at,
    settleReviews,
    headSha
  });
  const decision = decide(lastHeadAt, nowMs);
  const blockers = threads.unavailable ? ["review threads unavailable", ...decision.blockers] : decision.blockers;
  const wouldMerge = decision.wouldMerge && !threads.unavailable;
  const otherWouldMerge = !threads.unavailable && decision.blockers.every(isSettleBlocker);
  if (!wouldMerge) {
    const settle = lastHeadAt ? reviewSettle({ lastHeadAt, nowMs, reviews: [...prView.reviews ?? [], ...settleReviews], me }) : { settled: false, remainingMs: 0 };
    if (otherWouldMerge && lastHeadAt && settle.remainingMs > 0 && !settle.settled) {
      await reviewSettleSleep(Math.min(settle.remainingMs, REVIEW_SETTLE_MS));
      const again = lastHeadAtOrBlock(repo, number);
      const retry = decide(again.unavailable ? null : again.lastHeadAt, Date.now());
      if (!retry.wouldMerge) {
        const retryBlockers = threads.unavailable ? ["review threads unavailable", ...retry.blockers] : retry.blockers;
        const arm = armIntentGate(repo, number, gate, liveIntentGateWriters);
        const allBlockers = [...retryBlockers, ...arm.blockers];
        if (!arm.armed) {
          console.error(`❌ ${GATE_ARM_BLOCKER} — the reporter is not confirmed to have been asked: ${arm.gateArmError}`);
        }
        return {
          number,
          merged: false,
          policy,
          blockers: allBlockers,
          ...arm.attempted ? { gateArmed: arm.armed } : {},
          ...arm.gateArmError ? { gateArmError: arm.gateArmError } : {},
          ...retry.unsatisfiable ? { unsatisfiable: true } : {}
        };
      }
    } else {
      const arm = armIntentGate(repo, number, gate, liveIntentGateWriters);
      const allBlockers = [...blockers, ...arm.blockers];
      if (!arm.armed) {
        console.error(`❌ ${GATE_ARM_BLOCKER} — the reporter is not confirmed to have been asked: ${arm.gateArmError}`);
      }
      return {
        number,
        merged: false,
        policy,
        blockers: allBlockers,
        ...arm.attempted ? { gateArmed: arm.armed } : {},
        ...arm.gateArmError ? { gateArmError: arm.gateArmError } : {},
        ...decision.unsatisfiable ? { unsatisfiable: true } : {}
      };
    }
  }
  const preMerge = unresolvedThreadsOrBlock(repo, number);
  if (preMerge.count > 0 || preMerge.unavailable) {
    const late = preMerge.unavailable ? ["review threads unavailable"] : [`${preMerge.count} unresolved review thread(s) — address + resolve them first`];
    const arm = armIntentGate(repo, number, gate, liveIntentGateWriters);
    if (!arm.armed) {
      console.error(`❌ ${GATE_ARM_BLOCKER} — the reporter is not confirmed to have been asked: ${arm.gateArmError}`);
    }
    return {
      number,
      merged: false,
      policy,
      blockers: [...late, ...arm.blockers],
      ...arm.attempted ? { gateArmed: arm.armed } : {},
      ...arm.gateArmError ? { gateArmError: arm.gateArmError } : {}
    };
  }
  const result = ghPRMerge(repo, number, opts.mode ?? "squash", true);
  cleanupMergedLocalBranch(result.headBranch);
  await signalBestEffort(ctx, "prs", number, "merged", { repo, mergedSha: result.mergedSha }, "Merged but ShipFlow signal failed");
  const closed = await releaseClaimsAfterAutomerge(ctx, repo, number, prView);
  return { number, merged: true, mergedSha: result.mergedSha, policy, closedIssues: closed };
}
function registerPRCommand(program2) {
  const pr = program2.command("pr").description("Pull request actions");
  pr.command("create").description("Open a PR; prepends ShipFlow context to the body and signals ShipFlow").option("--issue <n>", "Issue number this PR closes (auto-detected from branch if omitted)").option("--partial", "This PR is a partial slice: link the issue as 'Part of #N' (no closing keyword) so merging leaves the parent open").option("--title <title>", "PR title").option("--body <body>", "PR body (added under ShipFlow header)").option("--base <ref>", "Base branch").option("--draft", "Create as draft").option("--preview-url <url>", "Testing/preview site for this PR (relayed to the issue reporter)").option("--allow-suspicious-email", "Skip the commit-email identity guard (not recommended)").addOption(new Option("--lint <mode>", "Prose lint on --body (issue #196): warn (print problems, proceed) or strict (exit 2, no PR). Anything else is REFUSED (exit 1, no PR) — never treated as warn (issue #648)").choices([...LINT_MODES]).default("warn")).option("--json", "Output JSON").option("--yaml", "Output YAML").action(runAction(async (opts) => {
    const rawLint = opts.lint ?? "";
    if (!LINT_MODES.includes(rawLint)) {
      console.error(`Unknown lint mode "${opts.lint ?? ""}" — valid: ${LINT_MODES.join(", ")}. Nothing was created.`);
      process.exit(1);
    }
    if (!opts.allowSuspiciousEmail) {
      const bad = findSuspiciousEmails(branchAuthorEmails(), hostname3());
      if (bad.length) {
        console.error("Refusing to open a PR: commit author email(s) won't match a GitHub account (deployments will be blocked):");
        for (const b of bad)
          console.error(`  • ${b}`);
        console.error("Fix: renaiss-shipflow git-identity --fix   (sets a repo-local matched identity)");
        console.error("Then rewrite the offending commits: git commit --amend --reset-author --no-edit");
        console.error('  (several commits: git rebase --exec "git commit --amend --reset-author --no-edit" origin/<base>)');
        console.error("Bypass (not recommended): --allow-suspicious-email");
        process.exit(1);
      }
    }
    const lintProblems = [
      ...lintMessageBody(opts.body ?? ""),
      ...lintBodyLength(opts.body ?? ""),
      ...lintNearMissDeviationHeadings(opts.body ?? "")
    ];
    if (lintProblems.length) {
      if (opts.lint === "strict") {
        console.error("PR body failed prose lint — restructure it (or drop --lint=strict):");
        for (const p of lintProblems)
          console.error(`  • ${p}`);
        process.exit(2);
      }
      for (const p of lintProblems)
        console.warn(`⚠️  body lint: ${p}`);
    }
    const ctx = await loadCtx(program2);
    const branch = currentBranch();
    const issueNumber = opts.issue ? parseInt(opts.issue, 10) : detectIssueFromBranch(branch);
    if (!issueNumber)
      console.warn(unlinkedPrWarning(branch));
    const linkMode = opts.partial ? "part-of" : "closes";
    const issueUrl = issueNumber ? `https://github.com/${ctx.project.repoFullName}/issues/${issueNumber}` : undefined;
    const header = buildShipFlowHeader(ctx.project.projectName, issueNumber, issueUrl, linkMode);
    const body = `${header}

${opts.body ?? ""}`;
    const created = ghPRCreate({ repo: ctx.project.repoFullName, body, title: opts.title, base: opts.base, head: branch, draft: opts.draft });
    await signalBestEffort(ctx, "prs", created.number, "opened", {
      repo: ctx.project.repoFullName,
      branch,
      headSha: execSync5("git rev-parse HEAD").toString().trim(),
      issueRefs: issueNumber ? [issueNumber] : [],
      previewUrl: opts.previewUrl ?? ""
    }, "PR opened but ShipFlow signal failed");
    emit(opts, created, () => console.log(created.url));
  }));
  pr.command("merge <number>").description("Merge a PR; signals ShipFlow (no downstream cascade)").option("--mode <mode>", "squash | merge | rebase", "squash").option("--keep-branch", "Don't delete the head branch").option("--json", "Output JSON").option("--yaml", "Output YAML").action(runAction(async (numberStr, opts) => {
    const ctx = await loadCtx(program2);
    const { number, repo } = resolveTarget(ctx, numberStr, opts);
    const prView = ghPRView(repo, number);
    const gate = evalIntentGate(repo, number, prView);
    if (gate.applyLabel) {
      armIntentGate(repo, number, gate, liveIntentGateWriters);
    }
    if (gate.blocked) {
      const blockers = [
        gate.blockedBy ? `${INTENT_BLOCKER} (${INTENT_BLOCKED_BY_DETAIL[gate.blockedBy]})` : INTENT_BLOCKER
      ];
      emit(opts, { number, merged: false, blockers }, () => console.error(`⛔ Not merging PR #${number}: ${blockers[0]}`));
      process.exit(5);
    }
    const result = ghPRMerge(repo, number, opts.mode, !opts.keepBranch);
    if (!opts.keepBranch)
      cleanupMergedLocalBranch(result.headBranch);
    const signalOk = await signalBestEffort(ctx, "prs", number, "merged", {
      repo,
      mergedSha: result.mergedSha
    }, "Merged but ShipFlow signal failed");
    emit(opts, { number, merged: true, mergedSha: result.mergedSha, mode: opts.mode, signalOk }, () => console.log(`merged: ${result.mergedSha}`));
  }));
  pr.command("ready <number>").description("Report whether a PR is mergeable under the active merge policy (read-only — used by the loop)").option("--policy <p>", `Override merge policy — one of: ${MERGE_POLICIES.join(" | ")}. Anything else is REFUSED (exit 1) — never narrowed to a policy you did not ask for (issue #669)`).option("--repo <fullname>", "Override target repo").option("--json", "Output JSON").option("--yaml", "Output YAML").action(runAction(async (numberStr, opts) => {
    const rawPolicy = opts.policy?.trim();
    if (rawPolicy !== undefined && !MERGE_POLICIES.includes(rawPolicy)) {
      const msg = `Unknown merge policy "${opts.policy}" — valid: ${MERGE_POLICIES.join(", ")}. Nothing was evaluated. Omit --policy to use the configured policy.`;
      if (opts.json)
        console.log(JSON.stringify({ error: msg }));
      else
        console.error(`⛔ ${msg}`);
      process.exit(1);
    }
    const ctx = await loadCtx(program2);
    const { number, repo } = resolveTarget(ctx, numberStr, opts);
    const policy = rawPolicy ?? resolveMergePolicy();
    const staleHours = resolveStalePrHours();
    const me = ghCurrentLogin();
    const prView = ghPRView(repo, number);
    const threads = unresolvedThreadsOrBlock(repo, number);
    const unresolvedThreads = threads.count;
    const gate = evalIntentGate(repo, number, prView);
    const headSha = commitSha(prView.headRefOid);
    const approvedSha = approvedHeadSha(prView.comments);
    const cl = classifyPR(prView, me, { staleHours, unresolvedThreads, intentBlocked: gate.blocked, headSha });
    const freshness = ghPRFreshness(repo, prView);
    const lastHead = lastHeadAtOrBlock(repo, number);
    const decision = mergeDecision(prView, me, { policy, requireCi: resolveRequireCi(), staleHours, unresolvedThreads, intentBlocked: gate.blocked, intentBlockedBy: gate.blockedBy, behindBy: freshness.behindBy, freshnessUnresolvable: freshness.unresolvable, lastHeadAt: lastHead.unavailable ? null : lastHead.lastHeadAt, settleReviews: threads.settleReviews ?? [], headSha });
    const blockers = threads.unavailable ? ["review threads unavailable", ...decision.blockers] : decision.blockers;
    const wouldMerge = decision.wouldMerge && !threads.unavailable;
    const out = {
      number,
      state: cl.state,
      ciState: cl.ciState,
      approved: cl.approved,
      unresolvedThreads,
      ageHours: Math.round(cl.ageHours),
      policy,
      wouldMerge,
      blockers,
      approvedSha,
      headSha
    };
    emit(opts, out, () => {
      console.log(`PR #${number}: ${wouldMerge ? "✅ READY TO MERGE" : "⏸️  NOT READY"} · ${cl.state} · ci=${cl.ciState} · approved=${cl.approved} · policy=${policy}`);
      for (const b of blockers)
        console.log(`  [ ] ${b}`);
    }, { pretty: true });
  }));
  pr.command("automerge [number]").description("Merge a PR only if policy + CI + approval allow it; otherwise no-op and exit 5. The loop's safe auto-merge. --all-ready evaluates every own open PR OLDEST-FIRST in one sweep (issue #608 — merging first minimizes freshness-rebase rounds).").option("--all-ready", "Sweep all own open PRs oldest-first instead of one number").option("--policy <p>", `Override merge policy — one of: ${MERGE_POLICIES.join(" | ")}. Anything else is REFUSED (exit 1, nothing merged) — never narrowed to a policy you did not ask for (issue #669)`).option("--mode <mode>", "squash | merge | rebase", "squash").option("--repo <fullname>", "Override target repo").option("--json", "Output JSON").option("--yaml", "Output YAML").action(runAction(async (numberStr, opts) => {
    const rawPolicy = opts.policy?.trim();
    if (rawPolicy !== undefined && !MERGE_POLICIES.includes(rawPolicy)) {
      const msg = `Unknown merge policy "${opts.policy}" — valid: ${MERGE_POLICIES.join(", ")}. Nothing was merged. Omit --policy to use the configured policy.`;
      if (opts.json)
        console.log(JSON.stringify({ error: msg }));
      else
        console.error(`⛔ ${msg}`);
      process.exit(1);
    }
    if (rawPolicy !== undefined)
      opts.policy = rawPolicy;
    const ctx = await loadCtx(program2);
    if (!numberStr && !opts.allReady) {
      const msg = "pr automerge needs a PR number or --all-ready";
      if (opts.json)
        console.log(JSON.stringify({ error: msg }));
      else
        console.error(`⛔ ${msg}`);
      process.exit(1);
    }
    if (opts.allReady) {
      const repoAll = opts.repo ?? ctx.project.repoFullName;
      const meAll = resolveMeLogin("pr automerge --all-ready");
      const mine = ghOwnOpenPRs(repoAll, meAll).filter((p) => !p.isDraft);
      const results = [];
      for (const { number: n } of mine.sort((a, b) => a.number - b.number)) {
        try {
          const r2 = await automergeOnce(ctx, repoAll, n, opts);
          results.push(r2);
        } catch (e) {
          results.push({ number: n, merged: false, error: String(e.message ?? e).split(`
`)[0] });
        }
      }
      const merged = results.filter((r2) => r2.merged).length;
      const evaluated = results.length;
      emit(opts, { allReady: true, evaluated, merged, results }, () => console.log(allReadySweepLine(evaluated, merged)), { pretty: true });
      if (allReadySweepExit(evaluated, merged) !== 0)
        process.exit(5);
      return;
    }
    const { number, repo } = resolveTarget(ctx, numberStr, opts);
    const r = await automergeOnce(ctx, repo, number, opts);
    if (!r.merged) {
      emit(opts, r, () => {
        console.log(`⏸️  PR #${number} not auto-merged — still blocked on:`);
        for (const b of r.blockers ?? [])
          console.log(`  [ ] ${b}`);
        if (r.unsatisfiable)
          console.log("  ⚠️  This blocker cannot clear by waiting — escalate for a human decision.");
      });
      process.exit(5);
    }
    emit(opts, r, () => console.log(`✅ Merged PR #${number} (${r.mergedSha}) under policy=${r.policy}${(r.closedIssues ?? []).length ? ` — closes #${(r.closedIssues ?? []).join(", #")}` : ""}.`));
  }));
  pr.command("sync <number>").description("Rebase the PR's branch onto its (moved) base; aborts cleanly on conflict (or leaves it in progress with --keep-conflicts) so the loop can resolve or escalate. Run on the PR's checked-out branch.").option("--repo <fullname>", "Override target repo").option("--no-push", "Don't force-with-lease push after a clean rebase").option("--keep-conflicts", "On conflict, leave the rebase in progress and list the conflicted files instead of aborting — the agentic-resolution entry point (issue #393)").option("--json", "Output JSON").option("--yaml", "Output YAML").action(runAction(async (numberStr, opts) => {
    const ctx = await loadCtx(program2);
    const { number, repo } = resolveTarget(ctx, numberStr, opts);
    const prView = ghPRView(repo, number);
    const base = prView.baseRefName;
    const head = prView.headRefName;
    if (!base) {
      console.error(`PR #${number} has no base branch.`);
      process.exit(1);
    }
    const guard = syncEntryGuard({
      rebase: rebaseInProgress(),
      currentBranch: execSync5("git rev-parse --abbrev-ref HEAD").toString().trim(),
      head,
      number,
      base: rebaseOnto() ?? `origin/${base}`,
      root: printedRoot()
    });
    if (!guard.ok) {
      console.error(guard.message);
      process.exit(1);
    }
    const beforeSha = localHeadSha();
    try {
      execSync5(`git fetch origin ${shellQuote(base)}`, { stdio: "ignore" });
    } catch (e) {
      throw new Error(`git fetch origin ${base} failed (network or remote issue): ${e.message}`);
    }
    let conflicted = false;
    try {
      execSync5(`git rebase ${shellQuote(`origin/${base}`)}`, { stdio: "pipe" });
    } catch {
      conflicted = true;
      if (!opts.keepConflicts) {
        try {
          execSync5("git rebase --abort", { stdio: "ignore" });
        } catch {}
      }
    }
    if (conflicted) {
      if (opts.keepConflicts) {
        const conflictedFiles = gitPaths("git diff --name-only --diff-filter=U").paths;
        emit(opts, { number, rebased: false, conflict: true, base, keptInProgress: true, conflictedFiles }, () => {
          console.log(`\uD83D\uDD00 PR #${number}: rebase onto ${base} conflicts — left IN PROGRESS for resolution.`);
          for (const f of conflictedFiles)
            console.log(`  [U] ${f}`);
          for (const l of resolutionRecipe(`origin/${base}`, printedRoot()))
            console.log(l);
        });
      } else {
        emit(opts, { number, rebased: false, conflict: true, base }, () => console.log(`\uD83D\uDD00 PR #${number}: rebase onto ${base} conflicts — aborted. Resolve manually or escalate.`));
      }
      process.exit(6);
    }
    const changed = changedPaths(`origin/${base}`);
    if (!changed.ok) {
      emit(opts, { number, rebased: true, conflict: false, base, pushed: false, enumerationFailed: [changed.cmd] }, () => {
        console.error(`⛔ PR #${number}: could not enumerate the files changed against ${base} — refusing to push.`);
        console.error(`  failed: ${changed.cmd}`);
        console.error(`The marker gate cannot certify a tree it could not read. Re-check with: ${recheckCommand(`origin/${base}`)}`);
      });
      process.exit(8);
    }
    const markers = scanConflictMarkers(changed.paths);
    if (markers.length) {
      emit(opts, { number, rebased: true, conflict: false, base, pushed: false, conflictMarkers: markers }, () => {
        console.error(`⛔ PR #${number}: rebase onto ${base} succeeded but ${markers.length} conflict marker(s) remain — refusing to push.`);
        for (const h of markers.slice(0, 20))
          console.error(`  ${h.path}:${h.line}: ${h.text.slice(0, 60)}`);
        console.error(`Remove the markers, re-run the tests, then push. Re-check with: ${recheckCommand(`origin/${base}`)}`);
      });
      process.exit(8);
    }
    let pushed = false;
    if (opts.push !== false) {
      try {
        execSync5("git push --force-with-lease", { stdio: "ignore" });
      } catch (e) {
        throw new Error(`git push --force-with-lease failed (network, or the remote moved — rebase again): ${e.message}`);
      }
      pushed = true;
    }
    const droppedApproval = dropApprovedLabelIfNeeded({ pushed, beforeSha, afterSha: localHeadSha() }, () => ghIssueRemoveLabel(repo, number, APPROVED_LABEL));
    emit(opts, { number, rebased: true, conflict: false, base, pushed, droppedApproval }, () => console.log(`\uD83D\uDD00 PR #${number}: rebased "${head}" onto ${base}${pushed ? " and pushed" : ""}${droppedApproval ? " — dropped shipflow-approved (head moved)" : ""}.`));
  }));
  pr.command("conflict-check").description("Fail if the working tree still has unmerged paths or leftover conflict markers — the gate to run BEFORE `git rebase --continue` and before any force-with-lease push (exit 8 = not clean). Local only, no network.").option("--base <ref>", "Also scan every file this branch changed against <ref> (e.g. origin/main) — additive, never a replacement. Omitted, the base is resolved automatically: the in-flight rebase's `onto`, else origin/HEAD, else the repo default branch. Every ref actually scanned is listed in the JSON `bases`").option("--json", "Output JSON").option("--yaml", "Output YAML").action(runAction(async (opts) => {
    const resolved = resolveScanBase({
      onto: rebaseOnto(),
      originHead: originHeadRef(),
      defaultBranch: defaultBranchRef(),
      explicit: opts.base
    });
    const baseRefs = Array.from(new Set([resolved?.base, opts.base].filter((b) => !!b)));
    const sources = [
      gitPaths("git diff --name-only --diff-filter=U"),
      gitPaths("git diff --name-only HEAD"),
      ...baseRefs.map((b) => gitPaths(`git diff --name-only ${shellQuote(b)}...HEAD`))
    ];
    const enumerationFailed = sources.filter((s) => !s.ok).map((s) => s.cmd);
    const unmerged = sources[0].paths;
    const paths = Array.from(new Set(sources.flatMap((s) => s.paths)));
    const markers = scanConflictMarkers(paths);
    const rebase = rebaseInProgress();
    const indeterminate = !resolved && paths.length === 0;
    const clean = !indeterminate && enumerationFailed.length === 0 && unmerged.length === 0 && markers.length === 0;
    const alsoScanned = baseRefs.filter((b) => b !== resolved?.base);
    const via = resolved ? ` vs ${resolved.base} (${resolved.source})${alsoScanned.length ? ` + ${alsoScanned.join(", ")}` : ""}` : "";
    emit(opts, {
      clean,
      indeterminate,
      unmerged,
      conflictMarkers: markers,
      rebaseInProgress: rebase,
      base: resolved?.base ?? null,
      baseSource: resolved?.source ?? null,
      bases: baseRefs,
      scanned: paths.length,
      enumerationFailed
    }, () => {
      if (clean) {
        console.log(`✅ No unmerged paths, no conflict markers (${paths.length} file(s) scanned${via})${rebase ? ` — rebase still in progress, safe to \`git rebase --continue\`` : ""}.`);
        return;
      }
      console.error(`⛔ Not clean — do NOT continue the rebase or push.`);
      if (via)
        console.error(`  scanned ${paths.length} file(s)${via}`);
      if (indeterminate) {
        console.error(`  [?] indeterminate: no base ref could be resolved and 0 file(s) were scanned — the gate proved nothing.`);
        console.error(`      Name one explicitly: ${recheckCommand("origin/<base>")}`);
      }
      const root = unmerged.length ? printedRoot() : null;
      for (const c of enumerationFailed)
        console.error(`  [E] could not enumerate paths: ${c} — the gate cannot certify a tree it could not read`);
      for (const f of unmerged)
        console.error(`  [U] ${f} — still unmerged; resolve it, then: ${anchoredGit(root, `add -- ${shellQuote(f)}`)}`);
      for (const h of markers.slice(0, 20))
        console.error(`  [M] ${h.path}:${h.line}: ${h.text.slice(0, 60)}`);
      if (markers.length > 20)
        console.error(`  … ${markers.length - 20} more marker line(s)`);
    });
    if (!clean)
      process.exit(8);
  }));
  pr.command("packet <number>").description("Emit the pre-baked review packet for a PR: spec/brief, description, CI, unresolved threads, evidence, and a noise-filtered budgeted diff — everything the loop reviewer needs in one call").option("--repo <fullname>", "Override target repo").option("--json", "Emit the packet as a structured object instead of markdown").option("--yaml", "Output YAML").action(runAction(async (numberStr, opts) => {
    const ctx = await loadGhCtx(program2, opts.repo);
    const { number, repo } = resolveTarget(ctx, numberStr, opts);
    const degraded = [...ctx.degraded];
    const prView = ghPRView(repo, number);
    let threads = [];
    let threadsUnavailable = false;
    try {
      threads = ghReviewThreads(repo, number);
    } catch (e) {
      threadsUnavailable = true;
      degraded.push(GITHUB_GRAPHQL_DEP);
      console.warn(reviewThreadsUnavailableWarning(flattenCause(e)));
    }
    const diff = ghPRDiffText(repo, number);
    let issue = null;
    const closing = prView.closingIssuesReferences?.[0];
    const linkedNum = closing?.number ?? partOfIssueNumbers(prView.body)[0] ?? 0;
    let specUnavailable = null;
    let specNotReadable = null;
    if (linkedNum > 0) {
      try {
        issue = { ...ghIssueView(repo, linkedNum), linkKind: closing ? "closes" : "part-of" };
      } catch (e) {
        if (classifyIssueReadFailure(e) === "not-an-issue") {
          specNotReadable = { number: linkedNum, repo };
          console.warn(specNotReadableIssueNote(linkedNum, repo));
        } else {
          specUnavailable = linkedNum;
          if (!degraded.includes(GITHUB_GRAPHQL_DEP))
            degraded.push(GITHUB_GRAPHQL_DEP);
          console.warn(specUnavailableWarning(linkedNum, flattenCause(e)));
        }
      }
    }
    let features;
    let skipCause = null;
    let featureMapNotApplicable = null;
    if (!ctx.project.projectId) {
      if (ctx.projectNotApplicable)
        featureMapNotApplicable = ctx.project.repoFullName;
      else
        skipCause = "no ShipFlow project resolved for the target repo";
    }
    if (ctx.project.projectId) {
      try {
        const fm = await ctx.client.getFeatureMapping(ctx.creds.org, ctx.project.projectId);
        features = Object.entries(fm.features ?? {}).map(([key, f]) => ({
          key,
          name: f.name || key,
          paths: f.paths ?? [],
          layer: f.layer || undefined,
          description: f.description || undefined,
          testPriority: f.test_priority || undefined
        }));
      } catch (e) {
        if (isDependencyUnavailable(e))
          degraded.push(SHIPFLOW_API_DEP);
        skipCause = flattenCause(e);
      }
    }
    if (skipCause && !ctx.degraded.length)
      console.warn(featureMapSkippedWarning(skipCause));
    else if (featureMapNotApplicable)
      console.warn(featureMapNotApplicableNote(featureMapNotApplicable));
    emit(opts, {
      ...withProvenance(buildReviewPacketData({ pr: prView, threads, diff, issue, features, repo, threadsUnavailable, specUnavailable, specNotReadable, featureMapSkipCause: skipCause, featureMapNotApplicable })),
      ...degradedField({ degraded })
    }, () => console.log(buildReviewPacket({ pr: prView, threads, diff, issue, features, repo, threadsUnavailable, specUnavailable, specNotReadable, featureMapSkipCause: skipCause, featureMapNotApplicable })), { pretty: true });
  }));
  pr.command("diff <number>").description("Capture a PR's FULL unfiltered diff from GitHub to a file — the security scan's input. Never reads local git, so a detached or stale worktree cannot empty it; exits 9 when the diff has zero files, unconditionally, and writes nothing at all in that case").requiredOption("--out <path>", "File to write the raw diff bytes to").option("--repo <fullname>", "Override target repo").option("--json", "Output JSON").option("--yaml", "Output YAML").action(runAction(async (numberStr, opts) => {
    const ctx = await loadGhCtx(program2, opts.repo);
    const { number, repo } = resolveTarget(ctx, numberStr, opts);
    const diff = ghPRDiffText(repo, number);
    const census = changedFilesOrNull(repo, number);
    const names = census.paths;
    const files = countDiffFiles(diff);
    const lines = countDiffLines(diff);
    const sha256 = diffDigest(diff);
    const out = {
      number,
      out: opts.out,
      files,
      lines,
      sha256,
      changedFiles: census.unavailable ? null : names.length,
      ...degradedField({ degraded: census.unavailable ? [...ctx.degraded, GITHUB_REST_DEP] : ctx.degraded })
    };
    if (files === 0) {
      emit(opts, { ...out, ok: false, reason: "empty diff capture" }, () => {
        console.error(`⛔ Empty diff capture for PR #${number}: GitHub served 0 file(s), so nothing was written to ${opts.out}; ${census.unavailable ? "GitHub's file list could not be read" : `GitHub's file list reports ${names.length} changed file(s)`}.`);
        console.error(`   Nothing here is scannable — do NOT scan ${opts.out} and do NOT report CLEAN.`);
        if (names.length)
          console.error(`   Changed per GitHub: ${names.slice(0, 10).join(", ")}${names.length > 10 ? ` … (+${names.length - 10})` : ""}`);
        else if (!census.unavailable)
          console.error(`   Both sources came back empty — treat that as "could not read this PR", not as "this PR is empty".`);
      });
      process.exit(SCAN_EXIT);
    }
    writeCapture(opts.out, diff);
    emit(opts, { ...out, ok: true }, () => console.log(`files=${files} lines=${lines} sha256=${sha256}`));
  }));
  pr.command("post-review <number>").description("Post the loop reviewer's findings as a formal review with INLINE diff-anchored comments (like the server) — findings sit on the code diff, not a diff-less top-level comment").option("--summary <text>", "1-2 sentence verdict summary").option("--verdict <v>", `One of: ${LOOP_VERDICTS.join(" | ")}. Anything else is REFUSED (exit 1, nothing posted) — never rewritten to \`comment\` (issue #671)`, "comment").option("--findings <path>", "JSON file of findings (array or {findings:[...]}). Pass '-' to read stdin — stdin is read ONLY with '-'. Without the flag the command posts ZERO findings, and a bare `… | pr post-review` FAILS LOUDLY (exit 1, nothing posted) instead of dropping the pipe silently: any byte seen on stdin before the review is posted refuses, however slow the producer (issue #427)").option("--scan-files <n>", "Attestation (issue #407): how many files the security scan actually READ. Cross-checked against GitHub's changed-file count; required to post --verdict approve on a code diff").option("--scan-report <path>", "The security scan's written findings — must be a non-empty file; required to approve, and recorded in the review body").option("--scan-digest <sha256>", "The `sha256=` that `pr diff` printed for the capture you scanned — re-derived from GitHub and refused when it differs; required to approve").option("--repo <fullname>", "Override target repo").option("--json", "Output JSON").option("--yaml", "Output YAML").action(runAction(async (numberStr, opts) => {
    const rawVerdict = (opts.verdict ?? "").trim();
    if (!LOOP_VERDICTS.includes(rawVerdict)) {
      console.error(`Unknown review verdict "${opts.verdict ?? ""}" — valid: ${LOOP_VERDICTS.join(", ")}`);
      console.error(`   Nothing was posted. A blocking verdict is \`--verdict request_changes\`.`);
      process.exit(1);
    }
    const verdict = rawVerdict;
    const ctx = await loadGhCtx(program2, opts.repo);
    const { number, repo } = resolveTarget(ctx, numberStr, opts);
    let rawFindings;
    let stdinWatch = null;
    if (opts.findings && opts.findings !== "-")
      rawFindings = readFileSync4(opts.findings, "utf8");
    else if (opts.findings === "-")
      rawFindings = await readStdin2();
    else {
      stdinWatch = watchStdinBytes();
      if (await stdinWatch.within(STDIN_PEEK_MS))
        refuseUnflaggedPipe(number);
      rawFindings = "";
    }
    let parsed;
    try {
      parsed = JSON.parse(rawFindings || "[]");
    } catch {
      console.error("--findings must be valid JSON (an array, or {findings:[...]})");
      process.exit(1);
    }
    const findings = Array.isArray(parsed) ? parsed : parsed?.findings ?? [];
    const issueErr = findingsIssueGuardError(findings);
    if (issueErr) {
      console.error(`--findings: ${issueErr}`);
      console.error("   Nothing was posted. Each finding needs a non-empty string `issue` (not title/summary).");
      process.exit(1);
    }
    const census = changedFilesOrNull(repo, number);
    const approving = verdict === "approve";
    let prDiff = null;
    if (approving) {
      try {
        prDiff = ghPRDiffText(repo, number);
      } catch {
        prDiff = null;
      }
    }
    const scan = evaluateScanAttestation({
      approving,
      attested: parseScanFiles(opts.scanFiles),
      expected: census.unavailable ? null : census.paths.length,
      paths: census.paths,
      reportExists: scanReportUsable(opts.scanReport),
      attestedDigest: opts.scanDigest ?? null,
      actualDigest: prDiff === null ? null : diffDigest(prDiff)
    });
    const scanField = { files: scan.files, expected: scan.expected, verdict: scan.verdict };
    if (!scan.ok) {
      emit(opts, { number, verdict, posted: false, scan: scanField, ...degradedField({ degraded: [...ctx.degraded, ...scan.degraded] }) }, () => {
        console.error(`⛔ Not posting an approve review on PR #${number}: ${scan.reason}`);
        console.error(`   Capture the diff server-side, READ that file, then attest to what you read:`);
        console.error(`     renaiss-shipflow pr diff ${number} --out /tmp/pr-${number}.patch   # prints files=<n> … sha256=<hex>`);
        console.error(`     …then re-run with --scan-files <n> --scan-report <path> --scan-digest <sha256>.`);
        console.error(`   Reporting that the scan could not run is always allowed: --verdict request_changes.`);
      });
      process.exit(SCAN_EXIT);
    }
    const diffText = prDiff ?? ghPRDiffText(repo, number);
    const anchors = diffAnchors(diffText);
    const hunks = diffHunks(diffText);
    const summary = [
      stripScanLines(opts.summary ?? ""),
      recordsScanLine(scan, approving) ? scanAttestationLine(scan, opts.scanReport, opts.scanDigest) : ""
    ].filter(Boolean).join(`

`);
    const payload = buildReviewPayload({ summary, verdict, findings, anchors, hunks });
    if (stdinWatch && await stdinWatch.sawBytes())
      refuseUnflaggedPipe(number);
    stdinWatch?.release();
    ghCreateReview(repo, number, payload);
    const inlineCount = payload.comments.length;
    const foldedCount = findings.length - inlineCount;
    emit(opts, { number, verdict, posted: true, inline: inlineCount, folded: foldedCount, scan: scanField, ...degradedField({ degraded: [...ctx.degraded, ...scan.degraded] }) }, () => console.log(`Posted ${verdict} review on #${number}: ${inlineCount} inline finding(s) on the diff${foldedCount ? `, ${foldedCount} folded into the body` : ""}.`));
  }));
  pr.command("approve <number>").description("Record the loop reviewer's approval: adds the shipflow-approved label (the automerge approval source) + an optional comment").option("--comment <text>", "Reviewer summary to post on the PR").option("--scan-files <n>", "Attestation (issue #407): how many files the security scan actually READ. Cross-checked against GitHub's changed-file count; required to approve a code diff").option("--scan-report <path>", "The security scan's written findings — must be a non-empty file; required to approve, and recorded in the approval comment").option("--scan-digest <sha256>", "The `sha256=` that `pr diff` printed for the capture you scanned — re-derived from GitHub and refused when it differs; required to approve").option("--repo <fullname>", "Override target repo").option("--force", "Approve even with unresolved review threads (not recommended)").option("--json", "Output JSON").option("--yaml", "Output YAML").action(runAction(async (numberStr, opts) => {
    const ctx = await loadGhCtx(program2, opts.repo);
    const { number, repo } = resolveTarget(ctx, numberStr, opts);
    const threadCensus = reviewThreadCensus(ghReviewThreads(repo, number), ghCurrentLogin());
    if (threadCensus.unresolvedThreads && !opts.force) {
      const rows = threadCensus.unresolved.map((t) => [t.author ?? "?", `${t.path}:${t.line ?? "?"}`, t.body.split(`
`)[0].slice(0, 80)]);
      const list = renderTable(["Reviewer", "Location", "Comment"], rows).map((l) => `  ${l}`).join(`
`);
      emit(opts, { number, approved: false, unresolvedThreads: threadCensus.unresolvedThreads, ...degradedField(ctx) }, () => console.error(`⛔ Not approving PR #${number}: ${threadCensus.unresolvedThreads} unresolved review thread(s):
${list}
Address + resolve them (pr resolve), then approve (or --force).`));
      process.exit(7);
    }
    const census = changedFilesOrNull(repo, number);
    const scan = evaluateScanAttestation({
      approving: true,
      attested: parseScanFiles(opts.scanFiles),
      expected: census.unavailable ? null : census.paths.length,
      paths: census.paths,
      reportExists: scanReportUsable(opts.scanReport),
      attestedDigest: opts.scanDigest ?? null,
      actualDigest: prDiffDigestOrNull(repo, number)
    });
    const scanField = { files: scan.files, expected: scan.expected, verdict: scan.verdict };
    if (!scan.ok) {
      emit(opts, { number, approved: false, scan: scanField, ...degradedField({ degraded: [...ctx.degraded, ...scan.degraded] }) }, () => {
        console.error(`⛔ Not approving PR #${number}: ${scan.reason}`);
        console.error(`   Capture the diff server-side, READ that file, then attest to what you read:`);
        console.error(`     renaiss-shipflow pr diff ${number} --out /tmp/pr-${number}.patch   # prints files=<n> … sha256=<hex>`);
        console.error(`     …then re-run: renaiss-shipflow pr approve ${number} --scan-files <n> --scan-report <path> --scan-digest <sha256>`);
        console.error(`   A scan that could not run is request_changes (pr post-review ${number} --verdict request_changes), never an approval.`);
      });
      process.exit(SCAN_EXIT);
    }
    const headSha = commitSha(ghPRHeadOid(repo, number));
    if (!headSha) {
      emit(opts, { number, approved: false, scan: scanField, ...degradedField({ degraded: [...ctx.degraded, GITHUB_REST_DEP] }) }, () => {
        console.error(`⛔ Not approving PR #${number}: the current head SHA could not be read, so the approval cannot be bound to a commit.`);
        console.error(`   No label was applied — a label with no SHA is the exact hole this gate exists to close. Re-run when GitHub answers.`);
      });
      process.exit(SCAN_EXIT);
    }
    opts.comment = [stripScanLines(opts.comment ?? ""), scanAttestationLine(scan, opts.scanReport, opts.scanDigest), renderApprovedHeadMarker(headSha)].filter(Boolean).join(`

`);
    try {
      execSync5(`gh pr comment ${number} --repo ${shellQuote(repo)} --body ${shellQuote(stampLoopReview(opts.comment))}`, { stdio: ["ignore", "ignore", "inherit"] });
    } catch (e) {
      emit(opts, { number, approved: false, scan: scanField, ...degradedField({ degraded: [...ctx.degraded, GITHUB_REST_DEP] }) }, () => {
        console.error(`⛔ Not approving PR #${number}: the scan attestation comment could not be posted (${flattenCause(e)}).`);
        console.error(`   No label was applied — an approval whose attestation is missing from the PR is exactly the unfalsifiable state this gate exists to prevent. Re-run when GitHub answers.`);
      });
      process.exit(SCAN_EXIT);
    }
    ghEnsureLabel(repo, APPROVED_LABEL, labelColorFor(APPROVED_LABEL), "Reviewed and approved by the ShipFlow loop reviewer");
    ghIssueAddLabels(repo, number, [APPROVED_LABEL]);
    ghIssueRemoveLabel(repo, number, NEEDS_HUMAN_LABEL);
    emit(opts, { number, approved: true, label: APPROVED_LABEL, approvedSha: headSha, scan: scanField, ...degradedField(ctx) }, () => console.log(`✅ PR #${number} approved — labelled "${APPROVED_LABEL}" (automerge can proceed under an auto-* policy).
   ${scanAttestationLine(scan, opts.scanReport, opts.scanDigest)}
   bound to ${headSha}`));
  }));
  pr.command("reviews <number>").description("Read-only query of unresolved review threads (incl. bots) — parse JSON blocking/unresolvedThreads; rc is not the signal (always 0, like pr ready)").option("--repo <fullname>", "Override target repo").option("--json", "Output JSON").option("--yaml", "Output YAML").action(runAction(async (numberStr, opts) => {
    const ctx = await loadGhCtx(program2, opts.repo);
    const { number, repo } = resolveTarget(ctx, numberStr, opts);
    const threads = ghReviewThreads(repo, number);
    const census = reviewThreadCensus(threads, ghCurrentLogin());
    const out = {
      number,
      blocking: census.blocking,
      unresolvedThreads: census.unresolvedThreads,
      externalUnresolved: census.externalUnresolved,
      reviewers: [...new Set(threads.map((t) => t.author).filter(Boolean))],
      threads: census.unresolved.map((t) => ({ id: t.id, author: t.author, path: t.path, line: t.line, body: t.body })),
      ...degradedField(ctx)
    };
    emit(opts, withProvenance(out), () => {
      if (!census.unresolvedThreads) {
        console.log(`✅ PR #${number}: no unresolved review threads.`);
        return;
      }
      console.log(`PR #${number}: ${census.unresolvedThreads} unresolved thread(s)${out.blocking ? " — BLOCKS approval/merge" : ""}`);
      const rows = census.unresolved.map((t) => [t.author ?? "?", `${t.path}:${t.line ?? "?"}`, t.body.split(`
`)[0].slice(0, 90)]);
      for (const l of renderTable(["Reviewer", "Location", "Comment"], rows))
        console.log(`  ${l}`);
    }, { pretty: true });
  }));
  pr.command("await-checks <number>").description("Block until the PR's checks resolve (bounded) — JSON {ci: pass|fail|pending}; exit 0 on resolution (caller judges), exit 11 still-pending at timeout (issue #608)").option("--repo <fullname>", "Override target repo").option("--timeout-minutes <n>", "Bounded wait ceiling", "15").option("--interval-seconds <n>", "Poll interval", "30").option("--json", "Output JSON").action(runAction(async (numberStr, opts) => {
    const ctx = await loadGhCtx(program2, opts.repo);
    const { number, repo } = resolveTarget(ctx, numberStr, opts);
    if (Number.isNaN(number)) {
      const msg = `pr await-checks: "${numberStr}" is not a PR number`;
      if (opts.json)
        console.log(JSON.stringify({ error: msg }));
      else
        console.error(`⛔ ${msg}`);
      process.exit(1);
    }
    const timeoutMs = parseIntOr(opts.timeoutMinutes, 15) * 60000;
    const intervalMs = Math.max(5, parseIntOr(opts.intervalSeconds, 30)) * 1000;
    const started = Date.now();
    let ci = "pending";
    for (;; ) {
      ci = classifyChecks(ghPRCheckLines(repo, number));
      if (ci !== "pending" || Date.now() - started + intervalMs > timeoutMs)
        break;
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    const elapsedSeconds = Math.round((Date.now() - started) / 1000);
    emit(opts, { number, ci, elapsedSeconds, ...degradedField(ctx) }, () => console.log(`${ci === "pass" ? "✅" : ci === "fail" ? "❌" : "⏳"} PR #${number} checks: ${ci} after ${elapsedSeconds}s`), { pretty: true });
    if (ci === "pending")
      process.exit(11);
  }));
  pr.command("note <number>").description("Post a general PR comment WITH the loop marker — the loop's ONLY sanctioned free-text comment path (issue #603): an unmarked comment re-reads as a reporter correction on gated PRs (#477)").option("--repo <fullname>", "Override target repo").option("--body <text>", "Comment body (required)").option("--rework-from <commentId>", "Echo the acted-on comment id so the correction horizon moves (rework replies)").option("--json", "Output JSON").action(runAction(async (numberStr, opts) => {
    const ctx = await loadGhCtx(program2, opts.repo);
    const { number, repo } = resolveTarget(ctx, numberStr, opts);
    if (Number.isNaN(number)) {
      const msg = `pr note: "${numberStr}" is not a PR number`;
      if (opts.json)
        console.log(JSON.stringify({ error: msg }));
      else
        console.error(`⛔ ${msg}`);
      process.exit(1);
    }
    const body = (opts.body ?? "").trim();
    if (!body) {
      const msg = "pr note requires --body — an empty loop note has nothing to mark";
      if (opts.json)
        console.log(JSON.stringify({ error: msg }));
      else
        console.error(`⛔ ${msg}`);
      process.exit(1);
    }
    ghIssueComment(repo, number, renderPrNoteBody(body, opts.reworkFrom));
    emit(opts, { number, noted: true, marked: true, ...degradedField(ctx) }, () => console.log(`\uD83D\uDCDD marked note posted on PR #${number}`), { pretty: true });
  }));
  pr.command("resolve <number>").description("Resolve review threads the loop has addressed (all unresolved, or specific --thread ids)").option("--thread <id...>", "Specific thread node-id(s) to resolve (default: all unresolved)").option("--repo <fullname>", "Override target repo").option("--json", "Output JSON").option("--yaml", "Output YAML").action(runAction(async (numberStr, opts) => {
    const ctx = await loadGhCtx(program2, opts.repo);
    const { number, repo } = resolveTarget(ctx, numberStr, opts);
    const unresolved = ghReviewThreads(repo, number).filter((t) => !t.isResolved);
    const targets = opts.thread?.length ? unresolved.filter((t) => opts.thread.includes(t.id)) : unresolved;
    for (const t of targets)
      ghResolveReviewThread(t.id);
    emit(opts, { number, resolved: targets.length, ...degradedField(ctx) }, () => console.log(`\uD83E\uDDF5 Resolved ${targets.length} review thread(s) on PR #${number}.`));
  }));
}
function branchAuthorEmails() {
  for (const range of ["origin/main..HEAD", "origin/master..HEAD"]) {
    try {
      const out = execSync5(`git log --format=%ae ${range}`, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
      if (out)
        return out.split(`
`);
      return [];
    } catch {}
  }
  try {
    return execSync5("git log --format=%ae -30", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim().split(`
`).filter(Boolean);
  } catch {
    return [];
  }
}
async function readStdin2() {
  const chunks = [];
  for await (const c of process.stdin)
    chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}
function refuseUnflaggedPipe(number) {
  console.error(`⛔ Findings are piped to \`pr post-review ${number}\` but \`--findings -\` was not passed — refusing to post a review that would drop them (issue #427).`);
  console.error(`   Re-run the SAME pipe with the flag: … | renaiss-shipflow pr post-review ${number} --findings - --verdict <v> --summary "<1-2 sentences>"`);
  console.error(`   Or write the payload to a file and pass --findings <path>. Nothing was posted.`);
  process.exit(1);
}
var STDIN_PEEK_MS = 250;
var IDLE_WATCH = {
  within: () => Promise.resolve(false),
  sawBytes: () => Promise.resolve(false),
  release: () => {}
};
function watchStdinBytes() {
  const stdin = process.stdin;
  if (stdin.isTTY)
    return IDLE_WATCH;
  let saw = false;
  let closed = false;
  let released = false;
  let wake = null;
  function release() {
    if (released)
      return;
    released = true;
    stdin.removeListener("readable", onReadable);
    stdin.removeListener("end", onClose);
    stdin.removeListener("error", onClose);
    stdin.pause();
    stdin.destroy();
  }
  function onReadable() {
    const chunk = stdin.read();
    if (chunk === null || chunk.length === 0)
      return;
    saw = true;
    release();
    wake?.();
  }
  function onClose() {
    closed = true;
    release();
    wake?.();
  }
  stdin.on("readable", onReadable);
  stdin.once("end", onClose);
  stdin.once("error", onClose);
  return {
    within(ms) {
      if (saw)
        return Promise.resolve(true);
      if (closed)
        return Promise.resolve(false);
      return new Promise((resolve4) => {
        let settled = false;
        const settle = () => {
          if (settled)
            return;
          settled = true;
          clearTimeout(timer);
          wake = null;
          if (!released) {
            if (typeof stdin.unref === "function")
              stdin.unref();
            else
              release();
          }
          resolve4(saw);
        };
        wake = settle;
        const timer = setTimeout(settle, ms);
      });
    },
    async sawBytes() {
      for (let i = 0;i < 2 && !saw && !released; i++) {
        await new Promise((r) => {
          setImmediate(r);
        });
      }
      return saw;
    },
    release
  };
}
function currentBranch() {
  return execSync5("git rev-parse --abbrev-ref HEAD").toString().trim();
}
function detectIssueFromBranch(branch) {
  const m = branch.match(/^(?:issue|fix|feat)\/(?:issue-)?(\d+)/);
  return m ? parseInt(m[1], 10) : undefined;
}
function unlinkedPrWarning(branch) {
  return `⚠️  No linked issue: --issue was not given and branch "${branch}" carries no detectable issue number ` + "(accepted: issue/<n>, fix/<n>, feat/<n>, fix/issue-<n>, feat/issue-<n>). " + "The PR will open UNLINKED — merging it closes nothing, and any `issue wait --on` timer " + "parked on the intended issue waits forever. Pass --issue <n> to link it.";
}
function buildShipFlowHeader(project, issueNumber, issueUrl, linkMode = "closes") {
  const lines = ["## ShipFlow context", `- Project: ${project}`];
  if (issueNumber) {
    const ref = linkMode === "part-of" ? `Part of #${issueNumber}` : `Closes #${issueNumber}`;
    lines.push(issueUrl ? `- ${ref} — ${issueUrl}` : `- ${ref}`);
  }
  return lines.join(`
`);
}
function resolutionRecipe(baseRef, root = null) {
  return [
    `Resolve each file, then stage ONLY the paths you resolved: ${anchoredGit(root, "add -- <file>…")}`,
    "  (never `git add -A` here — it clears the UNMERGED state that stops git committing conflict markers)",
    `Gate before continuing: ${recheckCommand(baseRef)}   # exit 8 = markers/unmerged remain`,
    "Then: git rebase --continue (repeat per commit), run the FULL test suite, gate again, and push --force-with-lease."
  ];
}
function recheckCommand(baseRef) {
  return `renaiss-shipflow pr conflict-check --base ${baseRef}`;
}
function anchoredGit(root, args) {
  return root ? `git -C ${shellQuote(root)} ${args}` : `git ${args}`;
}
function printedRoot() {
  try {
    return repoToplevel();
  } catch {
    return null;
  }
}
var CONFLICT_MARKER_PATTERN = "^(<{7}|\\|{7}|={7}|>{7})( |$)";
var MARKER_START = /^<{7}( |$)/;
var MARKER_END = /^>{7}( |$)/;
function parseConflictMarkerRecords(out) {
  const byPath = new Map;
  const paths = [];
  let i = 0;
  while (i < out.length) {
    const pathEnd = out.indexOf("\x00", i);
    if (pathEnd === -1)
      break;
    const path = out.slice(i, pathEnd);
    const lineEnd = out.indexOf("\x00", pathEnd + 1);
    if (lineEnd === -1)
      break;
    const line = parseInt(out.slice(pathEnd + 1, lineEnd), 10);
    const nl = out.indexOf(`
`, lineEnd + 1);
    const text = nl === -1 ? out.slice(lineEnd + 1) : out.slice(lineEnd + 1, nl);
    if (Number.isFinite(line)) {
      let list = byPath.get(path);
      if (!list) {
        list = [];
        byPath.set(path, list);
        paths.push(path);
      }
      list.push({ path, line, text });
    }
    if (nl === -1)
      break;
    i = nl + 1;
  }
  const hits = [];
  for (const list of byPath.values()) {
    const hasStart = list.some((h) => MARKER_START.test(h.text));
    const hasEnd = list.some((h) => MARKER_END.test(h.text));
    if (hasStart || hasEnd)
      hits.push(...list);
  }
  return { hits, paths };
}
function gitPaths(cmd) {
  try {
    const out = execSync5(`${cmd} -z`, { cwd: repoToplevel(), stdio: ["ignore", "pipe", "ignore"] }).toString();
    return { paths: out.split("\x00").filter(Boolean), ok: true, cmd };
  } catch {
    return { paths: [], ok: false, cmd };
  }
}
function changedPaths(baseRef) {
  return gitPaths(`git diff --name-only ${shellQuote(baseRef)}...HEAD`);
}
function repoToplevel() {
  let root;
  try {
    root = execSync5("git rev-parse --show-toplevel", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch (e) {
    throw new Error(`conflict-marker scan failed (git rev-parse --show-toplevel): ${e.message}`);
  }
  if (!root)
    throw new Error("conflict-marker scan failed: git reported no worktree toplevel (bare repo?)");
  return root;
}
var PATHSPEC_CHUNK_FILES = 1000;
var PATHSPEC_CHUNK_BYTES = 1e5;
function chunkPathspecs(paths, maxFiles = PATHSPEC_CHUNK_FILES, maxBytes = PATHSPEC_CHUNK_BYTES) {
  const chunks = [];
  let current = [];
  let bytes = 0;
  for (const p of paths) {
    const cost2 = Buffer.byteLength(shellQuote(p)) + 1;
    if (current.length && (current.length >= maxFiles || bytes + cost2 > maxBytes)) {
      chunks.push(current);
      current = [];
      bytes = 0;
    }
    current.push(p);
    bytes += cost2;
  }
  if (current.length)
    chunks.push(current);
  return chunks;
}
function grepConflictMarkers(root, mode, chunk) {
  const pathspec = chunk.map(shellQuote).join(" ");
  const cmd = `git --literal-pathspecs grep --text -z ${mode} -E ${shellQuote(CONFLICT_MARKER_PATTERN)} -- ${pathspec}`;
  try {
    return execSync5(cmd, { cwd: root, stdio: ["ignore", "pipe", "ignore"] }).toString();
  } catch (e) {
    if (e.status === 1)
      return "";
    throw new Error(`conflict-marker scan failed (git grep): ${e.message}`);
  }
}
function scanConflictMarkers(paths, budget) {
  if (!paths.length)
    return [];
  const root = repoToplevel();
  const hits = [];
  for (const chunk of chunkPathspecs(paths, budget?.maxFiles, budget?.maxBytes)) {
    const matched = grepConflictMarkers(root, "-l", chunk).split("\x00").filter(Boolean);
    const parsed = parseConflictMarkerRecords(grepConflictMarkers(root, "-n", chunk));
    const missed = unrecoveredMatches(matched, parsed.paths);
    if (missed.length) {
      throw new Error(`conflict-marker scan failed: git grep matched ${missed.length} file(s) whose marker lines the parse could not recover ` + `(${missed.slice(0, 5).map((p) => JSON.stringify(p)).join(", ")}${missed.length > 5 ? ", …" : ""}). ` + `The gate cannot certify a tree it could not fully read — inspect those files by hand.`);
    }
    hits.push(...parsed.hits);
  }
  return hits;
}
function unrecoveredMatches(matched, recovered) {
  const seen = new Set(recovered);
  return matched.filter((p) => !seen.has(p));
}
function rebaseInProgress() {
  let gitDir;
  try {
    gitDir = execSync5("git rev-parse --absolute-git-dir", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return null;
  }
  if (existsSync3(join4(gitDir, "rebase-merge")))
    return "rebase-merge";
  if (existsSync3(join4(gitDir, "rebase-apply")))
    return "rebase-apply";
  return null;
}
function refExists(ref) {
  try {
    execSync5(`git rev-parse --verify --quiet ${shellQuote(`${ref}^{commit}`)}`, { stdio: ["ignore", "ignore", "ignore"] });
    return true;
  } catch {
    return false;
  }
}
function rebaseOnto() {
  const state = rebaseInProgress();
  if (!state)
    return null;
  try {
    const gitDir = execSync5("git rev-parse --absolute-git-dir", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    const onto = readFileSync4(join4(gitDir, state, "onto"), "utf8").trim();
    return onto && refExists(onto) ? onto : null;
  } catch {
    return null;
  }
}
function originHeadRef() {
  try {
    const ref = execSync5("git symbolic-ref --short refs/remotes/origin/HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    return ref && refExists(ref) ? ref : null;
  } catch {
    return null;
  }
}
function defaultBranchRef() {
  for (const candidate of ["origin/main", "origin/master"]) {
    if (refExists(candidate))
      return candidate;
  }
  return null;
}
function resolveScanBase(i) {
  if (i.onto)
    return { base: i.onto, source: "rebase-onto" };
  if (i.originHead)
    return { base: i.originHead, source: "origin-head" };
  if (i.defaultBranch)
    return { base: i.defaultBranch, source: "default-branch" };
  if (i.explicit)
    return { base: i.explicit, source: "explicit" };
  return null;
}
function syncEntryGuard(i) {
  const checkout = `git checkout ${shellQuote(i.head)}`;
  if (i.rebase) {
    const stage = anchoredGit(i.root ?? null, "add -- <file>…");
    return { ok: false, message: `A rebase (${i.rebase}) is already in progress in this worktree — PR #${i.number} can't sync until it is cleared.
` + `This is what an abandoned \`pr sync <n> --keep-conflicts\` leaves behind: HEAD is detached mid-rebase.
` + `Discard it: git rebase --abort   (or finish it: resolve, ${stage}, ${recheckCommand(i.base || "origin/<base>")}, git rebase --continue)` };
  }
  if (i.currentBranch === "HEAD") {
    return { ok: false, message: `HEAD is detached in this worktree, so PR #${i.number} ("${i.head}") is not checked out.
` + `Re-attach first: ${checkout}` };
  }
  if (i.currentBranch !== i.head) {
    return { ok: false, message: `On branch "${i.currentBranch}" but PR #${i.number} is "${i.head}". Check it out first: ${checkout}` };
  }
  return { ok: true };
}
function shouldDropApprovedLabel(i) {
  return i.pushed && i.headMoved;
}
function localHeadSha() {
  try {
    return commitSha(execSync5("git rev-parse HEAD").toString());
  } catch {
    return null;
  }
}
function dropApprovedLabelIfNeeded(i, remove) {
  const before = commitSha(i.beforeSha);
  const after = commitSha(i.afterSha);
  const headMoved = before !== null && after !== null && before !== after;
  if (!shouldDropApprovedLabel({ pushed: i.pushed, headMoved }))
    return false;
  remove();
  return true;
}

// src/commands/inbox.ts
init_pr_state();
function safeUnresolvedThreadCount(fetchThreads) {
  try {
    return { count: fetchThreads().filter((t) => !t.isResolved).length, degraded: false };
  } catch {
    return { count: 0, degraded: true };
  }
}
function gateClearanceReadFor(prNumber, intentBlocked, read) {
  return intentBlocked ? read(prNumber) : undefined;
}
function headClockReadFor(pr, me, read) {
  if (!loopReviewable(pr) || !loopReviewedHead(pr, me))
    return;
  try {
    return read(pr.number);
  } catch {
    return null;
  }
}
function inboxIntentBlocked(repo, pr) {
  const gate = evalIntentGate(repo, pr.number, pr);
  if (gate.applyLabel) {
    const arm = armIntentGate(repo, pr.number, gate, liveIntentGateWriters);
    if (!arm.armed) {
      console.warn(`⚠️  ${GATE_ARM_BLOCKER} on PR #${pr.number}: ${arm.gateArmError ?? "unknown"}`);
    }
  }
  return gate.blocked;
}
function foreignPrRow(entry, cl) {
  const { pr, trusted, distrust } = entry;
  return {
    number: pr.number,
    title: pr.title,
    branch: pr.headRefName,
    base: pr.baseRefName ?? "",
    url: pr.url,
    draft: pr.isDraft,
    reviewDecision: pr.reviewDecision || "none",
    unresolvedThreads: 0,
    closesIssues: (pr.closingIssuesReferences ?? []).map((i) => i.number),
    state: cl.state,
    ciState: cl.ciState,
    approved: cl.approved,
    ageHours: Math.round(cl.ageHours),
    needsAttention: trusted && cl.needsAction && cl.state === "conflict",
    reasons: trusted ? cl.reasons : [...cl.reasons, `untrusted_head:${distrust}`],
    foreign: true,
    author: pr.author?.login ?? "",
    trustedHead: trusted,
    ...trusted ? {} : { distrust, humanOnly: true }
  };
}
function minePrRow(pr, cl, ctx) {
  const corrections = cl.state === "reporter_corrected" ? reporterCorrectionsOn(pr) : [];
  const closesIssues = (pr.closingIssuesReferences ?? []).map((i) => i.number);
  const parentIssues = linkedIssueNumbers(pr);
  let escalateOnceUnknown = false;
  const owedReason = parentIssues.length > 0 ? escalationReasonsOwed(cl).find((r) => {
    const filed = ctx.parentWasEscalatedFor(parentIssues, pr.number, r);
    if (filed === "unknown")
      escalateOnceUnknown = true;
    return filed === false;
  }) ?? null : null;
  const escalateOnce = owedReason !== null;
  return {
    number: pr.number,
    title: pr.title,
    branch: pr.headRefName,
    base: pr.baseRefName ?? "",
    url: pr.url,
    draft: pr.isDraft,
    reviewDecision: pr.reviewDecision || "none",
    unresolvedThreads: ctx.unresolvedThreads,
    closesIssues,
    state: cl.state,
    ciState: cl.ciState,
    approved: cl.approved,
    ageHours: Math.round(cl.ageHours),
    needsAttention: cl.needsAction || escalateOnce,
    reasons: cl.reasons,
    ...cl.gateAgeHours !== undefined ? { gateAgeHours: Math.round(cl.gateAgeHours) } : {},
    ...corrections.length ? {
      correction: reporterCorrectionRow(corrections[0]),
      corrections: corrections.map(reporterCorrectionRow),
      parentNeedsHuman: ctx.parentIsEscalated(parentIssues)
    } : {},
    ...escalateOnce ? { escalateOnce: true, escalateOnceReason: owedReason, parentNeedsHuman: ctx.parentIsEscalated(parentIssues) } : {},
    ...ctx.degraded ? { threadsDegraded: true } : {},
    ...escalateOnceUnknown ? { escalateOnceUnknown: true } : {},
    ...ctx.degraded || escalateOnceUnknown ? { degraded: true } : {}
  };
}
function actionableConflicts(prs) {
  return prs.filter((p) => p.state === "conflict" && !p.humanOnly).length;
}
function escalateOnceNote(row) {
  if (row.reasons.includes(REWORK_CEILING_REASON))
    return "\uD83C\uDD98 escalate once (no rework left)";
  if (row.reasons.includes(CORRECTION_UNREADABLE_REASON))
    return "\uD83C\uDD98 escalate once (correction unreadable)";
  if (row.reasons.includes(REPORTER_GATE_STALE_REASON)) {
    return `\uD83C\uDD98 escalate once (gate stale — waiting ${Math.round(row.gateAgeHours ?? 0)}h)`;
  }
  if (row.reasons.includes(MERGED_UNREVIEWED_REASON))
    return "\uD83C\uDD98 escalate once (merged unreviewed)";
  return "\uD83C\uDD98 escalate once";
}
var PARKED_STATES = ["awaiting_review", "ci_pending", "awaiting_reporter", "merged_unreviewed"];
function parkedCount(prs) {
  return prs.filter((p) => p.needsAttention !== true && (PARKED_STATES.includes(p.state) || p.foreign === true && p.state === "reporter_corrected")).length;
}
function actionableCorrections(prs) {
  return prs.filter((p) => p.state === "reporter_corrected" && p.foreign !== true).length;
}
function actionableWip(prs) {
  return prs.filter((p) => p.foreign !== true && p.state !== "awaiting_reporter" && p.state !== "merged_unreviewed").length;
}
var GC_LOOKUP_BUDGET_MS = 20000;
function gcMergedLocalBranches(repo, deps = {}) {
  const {
    matches = localRepoMatches,
    candidates = localGcCandidates,
    lookup = ghPRMergedByHead,
    cleanup = cleanupMergedLocalBranch,
    isDirty = branchWorktreeDirty,
    isAncestor = isAncestorOfMergedHead,
    stillExists = localBranchExists,
    nowMs = Date.now
  } = deps;
  const empty = { cleaned: [], unpushed: [], dirty: [], failed: [], lookupsSkipped: 0 };
  try {
    if (!matches(repo))
      return empty;
    const branches = candidates();
    if (!branches.length)
      return empty;
    const deadline = nowMs() + GC_LOOKUP_BUDGET_MS;
    let lookupsSkipped = 0;
    const mergedByHead = new Map;
    for (const b of branches) {
      if (nowMs() > deadline) {
        lookupsSkipped++;
        continue;
      }
      try {
        const pr = lookup(repo, b.name);
        if (pr)
          mergedByHead.set(b.name, pr);
      } catch {}
    }
    const plan = planMergedBranchGc(branches, mergedByHead);
    const cleanable = [...plan.clean];
    const unpushed = [];
    for (const u of plan.unpushed) {
      const tip = branches.find((b) => b.name === u.name)?.tip ?? "";
      const head = mergedByHead.get(u.name)?.headRefOid ?? "";
      if (tip && head && isAncestor(tip, head))
        cleanable.push(u);
      else
        unpushed.push(u);
    }
    const cleaned = [];
    const dirty = [];
    const failed = [];
    for (const c of cleanable) {
      if (isDirty(c.name)) {
        dirty.push(c);
        continue;
      }
      cleanup(c.name);
      if (stillExists(c.name))
        failed.push(c);
      else
        cleaned.push(c);
    }
    return { cleaned, unpushed, dirty, failed, lookupsSkipped };
  } catch {
    return empty;
  }
}
var STATE_ICONS = {
  reporter_corrected: "\uD83D\uDCE3",
  awaiting_reporter: "\uD83D\uDE4B",
  conflict: "\uD83D\uDD00",
  ci_failing: "\uD83D\uDD34",
  changes_requested: "✏️",
  review_comments: "\uD83D\uDCAC",
  ci_pending: "⏳",
  approved_ready: "✅",
  needs_review: "\uD83D\uDD0E",
  stale: "\uD83D\uDD70️",
  awaiting_review: "·",
  merged_unreviewed: "\uD83D\uDEA8"
};
function collectInboxPrRows(repo, me, opts) {
  const { sweepEnabled, staleHours, maxReworks } = opts;
  let escalatedIssues = null;
  const parentIsEscalated = (issueNumbers) => {
    escalatedIssues ??= new Set(ghIssueListByLabel(repo, NEEDS_HUMAN_LABEL).map((i) => i.number));
    return issueNumbers.some((n) => escalatedIssues.has(n));
  };
  const parentMarkers = new Map;
  const parentReadFailed = new Set;
  const parentWasEscalatedFor = (issueNumbers, prNumber, reason) => {
    let unknown = false;
    const filed = issueNumbers.some((n) => {
      let bodies = parentMarkers.get(n);
      if (!bodies) {
        if (parentReadFailed.has(n)) {
          unknown = true;
          return false;
        }
        try {
          bodies = ghIssueComments(repo, n).filter((c) => c.viewerDidAuthor !== false).map((c) => c.body);
        } catch {
          parentReadFailed.add(n);
          unknown = true;
          console.warn(`⚠️  #${n}: could not read comments for the escalate-once key — PR #${prNumber} holds its escalation until the next tick.`);
          return false;
        }
        parentMarkers.set(n, bodies);
      }
      return bodies.some((b) => hasEscalateOnceMarker(b, prNumber, reason));
    });
    if (filed)
      return true;
    return unknown ? "unknown" : false;
  };
  const minePrs = ghPRListMine(repo);
  const scanned = minePrs.map((pr) => {
    const { count: unresolvedThreads, degraded } = safeUnresolvedThreadCount(() => ghReviewThreads(repo, pr.number));
    const intentBlocked = inboxIntentBlocked(repo, pr);
    const gateClearedAt = gateClearanceReadFor(pr.number, intentBlocked, (n) => ghIntentGateLastClearedAt(repo, n));
    const lastHeadAt = headClockReadFor(pr, me, (n) => ghPRLastHeadAt(repo, n));
    const cl = classifyPR(pr, me, { staleHours, unresolvedThreads, intentBlocked, maxReworks, gateClearedAt, headSha: pr.headRefOid, lastHeadAt });
    return { pr, row: minePrRow(pr, cl, { unresolvedThreads, degraded, parentIsEscalated, parentWasEscalatedFor }) };
  });
  if (sweepEnabled) {
    try {
      for (const entry of foreignConflictedPRs(minePrs, ghPRListAll(repo), me, { enabled: true })) {
        const foreignGated = inboxIntentBlocked(repo, entry.pr);
        const gateClearedAt = gateClearanceReadFor(entry.pr.number, foreignGated, (n) => ghIntentGateLastClearedAt(repo, n));
        const cl = classifyPR(entry.pr, me, { staleHours, intentBlocked: foreignGated, maxReworks, gateClearedAt, headSha: entry.pr.headRefOid });
        scanned.push({ pr: entry.pr, row: foreignPrRow(entry, cl) });
      }
    } catch {}
  }
  try {
    for (const pr of selectMergedUnreviewed(ghPRListMineMerged(repo), { staleHours })) {
      const cl = classifyMergedUnreviewed(pr);
      scanned.push({
        pr,
        row: minePrRow(pr, cl, {
          unresolvedThreads: 0,
          degraded: false,
          parentIsEscalated,
          parentWasEscalatedFor
        })
      });
    }
  } catch {}
  return scanned;
}
function registerInboxCommand(program2) {
  program2.command("inbox").description("Reconciler view: open PRs (by state: conflict / ci_failing / changes_requested / approved_ready / stale …) plus recently-merged @me PRs that bypassed the review gate (`merged_unreviewed`), and in-progress issues with new comments. With the OPT-IN repo-wide conflict sweep (`config set conflict-sweep true`, or --conflict-sweep) it also lists conflicted PRs by other authors — trusted same-repo heads only (issue #393)").option("--repo <fullname>", "Override target repo").option("--conflict-sweep", "Force the repo-wide foreign-PR conflict sweep on for this run (default: the `conflict-sweep` config key, which is off)").option("--json", "Output JSON").option("--yaml", "Output YAML").action(runAction(async (opts) => {
    const { project } = await loadCtx(program2);
    const repo = opts.repo ?? project.repoFullName;
    const me = ghCurrentLogin();
    const staleHours = resolveStalePrHours();
    const sweepEnabled = opts.conflictSweep === true || resolveConflictSweep();
    const maxReworks = resolveMaxFixAttempts();
    const gc = gcMergedLocalBranches(repo);
    for (const c of gc.cleaned) {
      console.warn(`\uD83E\uDDF9 ${c.name}: PR #${c.prNumber} merged externally — local branch/worktree cleaned.`);
    }
    for (const u of gc.unpushed) {
      console.warn(`⚠️  ${u.name}: PR #${u.prNumber} merged, but the local tip has commits the PR never saw — kept (unpushed work).`);
    }
    for (const d of gc.dirty) {
      console.warn(`⚠️  ${d.name}: PR #${d.prNumber} merged, but its worktree has uncommitted edits — kept (removal would destroy them).`);
    }
    for (const f of gc.failed) {
      console.warn(`⚠️  ${f.name}: PR #${f.prNumber} merged but cleanup could not remove the branch (busy worktree?) — will retry next tick.`);
    }
    if (gc.lookupsSkipped > 0) {
      console.warn(`⏱ merged-branch GC: ${gc.lookupsSkipped} candidate lookup(s) deferred to the next tick (time budget).`);
    }
    const prs = collectInboxPrRows(repo, me, { sweepEnabled, staleHours, maxReworks }).map((s) => s.row);
    const issues = ghIssueListByLabel(repo, IN_PROGRESS_LABEL).map((i) => {
      const reply = issueNeedsReply(i.comments ?? [], me);
      return {
        number: i.number,
        title: i.title,
        url: i.url,
        newComment: reply ? { author: reply.author?.login, at: reply.createdAt } : null,
        needsAttention: !!reply
      };
    });
    const count = (s) => prs.filter((p) => p.state === s).length;
    const degraded = prs.filter((p) => p.degraded).length;
    const threadsDegraded = prs.filter((p) => p.threadsDegraded).length;
    const degradedInputs = [
      ...threadsDegraded ? ["github-graphql"] : [],
      ...prs.some((p) => p.escalateOnceUnknown) ? ["escalate-once-markers"] : []
    ];
    const summary = {
      prsNeedingAttention: prs.filter((p) => p.needsAttention).length,
      issuesNeedingAttention: issues.filter((i) => i.needsAttention).length,
      readyToMerge: count("approved_ready"),
      ciFailing: count("ci_failing"),
      changesRequested: count("changes_requested"),
      conflicts: actionableConflicts(prs),
      stale: count("stale"),
      reporterCorrected: actionableCorrections(prs),
      parked: parkedCount(prs),
      degraded,
      degradedInputs,
      escalateOnceUnknown: prs.filter((p) => p.escalateOnceUnknown).length,
      conflictSweep: sweepEnabled,
      humanOnlyConflicts: prs.filter((p) => p.humanOnly).length,
      wipActionable: actionableWip(prs),
      mergedUnreviewed: count("merged_unreviewed"),
      gcCleaned: gc.cleaned.length,
      gcUnpushedKept: gc.unpushed.length + gc.dirty.length,
      gcFailed: gc.failed.length
    };
    emit(opts, withProvenance({ repo, prs, issues, summary, gc }), () => {
      console.log(`\uD83D\uDCE5 Inbox for ${repo}`);
      console.log(`Needs action: ${meter(summary.prsNeedingAttention, prs.length)} PRs · ${meter(summary.issuesNeedingAttention, issues.length)} issues · ✅ ${summary.readyToMerge} ready to merge`);
      if (threadsDegraded)
        console.log(`⚠️  ${threadsDegraded} PR(s) with partial review-thread data (fetch blipped) — marked "degraded".`);
      if (summary.escalateOnceUnknown) {
        console.log(`⚠️  ${summary.escalateOnceUnknown} PR(s) parked on an escalate-once key that could NOT be read — this inbox is INCOMPLETE, re-read before concluding there is no work.`);
      }
      if (summary.humanOnlyConflicts) {
        console.log(`\uD83D\uDD12 ${summary.humanOnlyConflicts} conflicted PR(s) on an untrusted head (fork / non-collaborator) — reported only, never checked out by the loop.`);
      }
      if (summary.mergedUnreviewed) {
        console.log(`\uD83D\uDEA8 ${summary.mergedUnreviewed} merged PR(s) bypassed the review gate — escalate once, never automerge.`);
      }
      if (prs.length) {
        console.log("");
        const rows = prs.map((p) => [
          `${STATE_ICONS[p.state] ?? "·"} #${p.number}`,
          p.state,
          `ci:${p.ciState}`,
          `${p.ageHours}h`,
          p.title + (p.correction ? ` \uD83D\uDCE3 @${p.correction.author} corrected the reading` : "") + (p.corrections && p.corrections.length > 1 ? ` (+${p.corrections.length - 1} more unanswered)` : "") + (p.escalateOnce ? ` ${escalateOnceNote(p)}` : "") + (p.parentNeedsHuman ? " (parent is needs-human)" : "") + (p.degraded ? " ⚠️ degraded" : "") + (p.humanOnly ? ` \uD83D\uDD12 ${p.distrust} — human only` : "")
        ]);
        for (const l of renderTable(["PR", "State", "CI", "Age", "Title"], rows))
          console.log(`  ${l}`);
      }
      if (issues.length) {
        console.log("");
        const rows = issues.map((i) => [
          `${i.needsAttention ? "\uD83D\uDCAC" : "·"} #${i.number}`,
          i.newComment ? `@${i.newComment.author}` : "—",
          i.title
        ]);
        for (const l of renderTable(["Issue", "New comment", "Title"], rows))
          console.log(`  ${l}`);
      }
    }, { pretty: true });
  }));
}

// src/commands/loop.ts
init_config();
init_gh();

// src/loop-plan.ts
init_config();
var PLAN_ACTION_BY_STATE = {
  reporter_corrected: "rework",
  awaiting_reporter: "park",
  conflict: "resolve_conflict",
  ci_failing: "fix_ci",
  changes_requested: "address_review",
  review_comments: "address_comments",
  ci_pending: "park",
  approved_ready: "automerge",
  needs_review: "review",
  stale: "nudge",
  awaiting_review: "park",
  merged_unreviewed: "park"
};
function planAction(state, flags = {}) {
  if (flags.humanOnly)
    return "park";
  if (flags.unsatisfiable)
    return "escalate_once";
  if (flags.escalateOnce)
    return "escalate_once";
  if (flags.behindBaseOnly && state === "approved_ready")
    return "sync_no_push";
  return PLAN_ACTION_BY_STATE[state];
}
var BEHIND_BASE_RE = /behind base/i;
function isBehindBaseOnly(blockers) {
  return blockers.length === 1 && BEHIND_BASE_RE.test(blockers[0] ?? "");
}
function mergePlanFlags(decision) {
  return {
    ...decision.unsatisfiable ? { unsatisfiable: true } : {},
    ...isBehindBaseOnly(decision.blockers) ? { behindBaseOnly: true } : {}
  };
}
function resolveLoopCap() {
  const env = process.env.SHIPFLOW_LOOP_CAP;
  if (env != null && env.trim().toLowerCase() === "all")
    return "all";
  if (env != null && env !== "")
    return parseIntOr(env, 5);
  return 5;
}
function capSlots(cap) {
  return cap === "all" ? Number.MAX_SAFE_INTEGER : cap;
}
function issuePriorityLabel(issue) {
  let best = null;
  let bestRank = 0;
  for (const l of issue.labels) {
    const name = l.name.toLowerCase();
    if (!name.startsWith("priority:"))
      continue;
    const token = name.slice("priority:".length);
    const rank = token === "critical" ? 4 : token === "high" ? 3 : token === "medium" ? 2 : token === "low" ? 1 : 0;
    if (rank >= bestRank) {
      bestRank = rank;
      best = token || null;
    }
  }
  return best;
}
function deferReason(issue, filter) {
  if (isActionableForPickup(issue, filter))
    return null;
  if (filter.claimed)
    return "claimed";
  const labels = issue.labels.map((l) => l.name);
  if (labels.includes(NEEDS_HUMAN_LABEL))
    return "needs-human";
  if (labels.includes(IN_PROGRESS_LABEL))
    return "in-progress";
  if (labels.includes(WAITING_ON_LABEL))
    return "waiting-on";
  if (filter.intakeMode !== "off" && labels.includes(NEEDS_REPORTER_APPROVAL_LABEL)) {
    return "needs-reporter-approval";
  }
  if (filter.label) {
    const wanted = filter.label.trim().toLowerCase();
    if (!labels.some((name) => name.trim().toLowerCase() === wanted))
      return "label-filter";
  }
  if (filter.assignee) {
    const wanted = filter.assignee.trim().toLowerCase();
    if (!issue.assignees.some((a) => String(a.login ?? "").trim().toLowerCase() === wanted)) {
      return "unassigned";
    }
  }
  if (filter.sliceMergedParents && isSliceMergedParked(issue, filter.sliceMergedParents, filter.openIssues ?? [], filter)) {
    return "slice-merged";
  }
  return "filtered";
}
function planReconcile(prs) {
  return prs.map((p) => {
    const action = planAction(p.state, {
      escalateOnce: p.escalateOnce,
      humanOnly: p.humanOnly,
      unsatisfiable: p.unsatisfiable,
      behindBaseOnly: p.behindBaseOnly
    });
    return {
      number: p.number,
      state: p.state,
      action,
      ...p.escalateOnce ? { escalateOnce: true } : {},
      ...p.unsatisfiable ? { unsatisfiable: true } : {}
    };
  });
}
function planAdmission(opts) {
  const deferred = [];
  const candidates = [];
  for (const issue of opts.issues) {
    const filter = {
      claimed: opts.claimed.has(issue.number),
      assignee: opts.assignee,
      intakeMode: opts.intakeMode,
      label: opts.label,
      sliceMergedParents: opts.sliceMergedParents,
      openIssues: opts.issues,
      claimedNumbers: opts.claimed
    };
    const reason = deferReason(issue, filter);
    if (reason) {
      deferred.push({ number: issue.number, reason });
      continue;
    }
    candidates.push(issue);
  }
  const ordered = sortIssuesForPickup(candidates);
  const wipSlots = Math.max(0, opts.wipLimit - opts.wipActionable);
  const slots = Math.min(capSlots(opts.cap), wipSlots);
  const overflowReason = wipSlots <= capSlots(opts.cap) ? "wip-limit" : "over-cap";
  const admit = [];
  for (const [i, issue] of ordered.entries()) {
    if (i < slots) {
      admit.push({ number: issue.number, title: issue.title, priority: issuePriorityLabel(issue) });
    } else {
      deferred.push({ number: issue.number, reason: overflowReason });
    }
  }
  return { admit, deferred };
}
function buildLoopPlan(input) {
  const { admit, deferred } = planAdmission({
    issues: input.issues,
    claimed: input.claimed,
    cap: input.policies.cap,
    wipActionable: input.wipActionable,
    wipLimit: input.policies.wipLimit,
    assignee: input.assignee,
    intakeMode: input.intakeMode,
    label: input.label,
    sliceMergedParents: input.sliceMergedParents
  });
  return {
    policies: input.policies,
    reconcile: planReconcile(input.prs),
    admit,
    deferred
  };
}

// src/commands/loop.ts
init_pr_state();
init_helpers();
function registerLoopCommand(program2) {
  const loop = program2.command("loop").description("Autonomous loop planner");
  loop.command("plan").description("Tick decision table: classifyPR state → action. Admit list is read-only (never claims)").option("--repo <fullname>", "Override target repo").option("--conflict-sweep", "Include foreign conflicted PRs (same as inbox)").option("--json", "Output JSON").option("--yaml", "Output YAML").action(runAction(async (opts) => {
    const ctx = await loadCtx(program2);
    const repo = opts.repo ?? ctx.project.repoFullName;
    const me = ghCurrentLogin();
    const staleHours = resolveStalePrHours();
    const sweepEnabled = opts.conflictSweep === true || resolveConflictSweep();
    const maxReworks = resolveMaxFixAttempts();
    const policy = resolveMergePolicy();
    const requireCi = resolveRequireCi();
    const pickupScope = resolvePickupScope();
    const policies = {
      mergePolicy: policy,
      requireCi,
      cap: resolveLoopCap(),
      wipLimit: resolveWipLimit(),
      pickupScope,
      intentGate: resolveIntentGateMode()
    };
    const scanned = collectInboxPrRows(repo, me, { sweepEnabled, staleHours, maxReworks });
    const prs = scanned.map(({ pr, row }) => {
      let extra = {};
      if (row.state === "approved_ready") {
        const freshness = ghPRFreshness(repo, pr);
        extra = mergePlanFlags(mergeDecision(pr, me, {
          policy,
          requireCi,
          staleHours,
          unresolvedThreads: row.unresolvedThreads,
          intentBlocked: row.reasons.includes(REPORTER_REVIEW_REASON),
          behindBy: freshness.behindBy,
          freshnessUnresolvable: freshness.unresolvable,
          headSha: pr.headRefOid
        }));
      }
      return {
        number: row.number,
        state: row.state,
        ...row.escalateOnce ? { escalateOnce: true } : {},
        ...row.humanOnly ? { humanOnly: true } : {},
        ...extra
      };
    });
    let assignee;
    if (pickupScope === "assigned") {
      assignee = resolveMeLogin("loop plan under pickup-scope=assigned (set pickup-scope all to widen)");
    }
    const open = ghIssueListWithAssociations(repo, 200, assignee);
    let claimed = new Set;
    try {
      const claims = await ctx.client.listClaims(ctx.creds.org, ctx.project.projectId);
      claimed = new Set(claims.filter((c) => c.repo === repo).map((c) => c.issueNumber));
    } catch {
      console.warn("⚠️ claims API unreachable — treating issues as unclaimed for the plan (read-only; nothing claimed).");
    }
    const sliceMergedParents = ghMergedPartOfParents(repo);
    const { reconcile, admit, deferred } = buildLoopPlan({
      policies,
      prs,
      issues: open,
      claimed,
      wipActionable: actionableWip(scanned.map((s) => s.row)),
      intakeMode: resolveIntakeApproval(),
      assignee,
      sliceMergedParents
    });
    emit(opts, withProvenance({ policies, reconcile, admit, deferred }), () => {
      console.log(`\uD83D\uDCCB Loop plan for ${repo}`);
      console.log(`Policies: merge-policy=${policies.mergePolicy} · require-ci=${policies.requireCi} · cap=${policies.cap} · wip-limit=${policies.wipLimit} · pickup-scope=${policies.pickupScope} · intent-gate=${policies.intentGate}`);
      if (reconcile.length) {
        console.log("");
        const rows = reconcile.map((r) => [
          `#${r.number}`,
          r.state,
          r.action + (r.escalateOnce ? " · escalateOnce" : "") + (r.unsatisfiable ? " · unsatisfiable" : "")
        ]);
        for (const l of renderTable(["PR", "State", "Action"], rows))
          console.log(`  ${l}`);
      }
      if (admit.length) {
        console.log("");
        const rows = admit.map((a) => [`#${a.number}`, a.priority ?? "—", a.title]);
        for (const l of renderTable(["Admit", "Priority", "Title"], rows))
          console.log(`  ${l}`);
      }
      if (deferred.length) {
        console.log("");
        const rows = deferred.map((d) => [`#${d.number}`, d.reason]);
        for (const l of renderTable(["Deferred", "Reason"], rows))
          console.log(`  ${l}`);
      }
    }, { pretty: true });
  }));
}

// src/commands/features.ts
init_helpers();

// src/feature-map.ts
var FEATURE_MAP_EMPTY_ERROR = "feature map loaded empty — 0 features is a failed load, not an empty project";
var FEATURE_MAP_EMPTY_DEP = "empty-map";
function featureMapEmptyEnvelope() {
  return { error: FEATURE_MAP_EMPTY_ERROR, features: {}, degraded: [FEATURE_MAP_EMPTY_DEP] };
}
function featureRecord(fm) {
  const features = fm?.features;
  if (!features || typeof features !== "object" || Array.isArray(features))
    return {};
  return features;
}
function verdictForFeatureMapping(fm) {
  if (Object.keys(featureRecord(fm)).length === 0)
    return { status: "empty" };
  return { status: "ok", mapping: fm };
}

// src/commands/regression.ts
init_output();
init_project();
init_helpers();
import { execSync as execSync6 } from "node:child_process";
var REF_RESOLUTION_ERROR = "Failed to resolve git HEAD ref. Ensure you are in a git repository with at least one commit, or pass --ref explicitly.";
function resolveRef(explicit, runGit = () => execSync6("git rev-parse HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim()) {
  if (explicit)
    return explicit;
  let ref = "";
  try {
    ref = runGit();
  } catch {
    throw new Error(REF_RESOLUTION_ERROR);
  }
  if (!ref)
    throw new Error(REF_RESOLUTION_ERROR);
  return ref;
}
var TERMINAL_STATUSES = ["success", "failure", "skipped"];
function isTerminalStatus(status) {
  return TERMINAL_STATUSES.includes(status);
}
function exitCodeForStatus(status) {
  return status === "failure" ? 1 : 0;
}
function statusGlyph(status) {
  return status === "success" ? "✅" : status === "failure" ? "\uD83D\uDD34" : status === "skipped" ? "⏭️" : "⏳";
}
function formatResultSummary(res) {
  const r = res.result ?? {};
  const status = typeof r.status === "string" ? r.status : "unknown";
  const lines = [`${statusGlyph(status)} Regression ${res.executionId}: ${status}`];
  const passed = typeof r.passed_tests === "number" ? r.passed_tests : undefined;
  const total = typeof r.total_tests === "number" ? r.total_tests : undefined;
  if (passed !== undefined && total !== undefined && total > 0)
    lines.push(`  ${meter(passed, total)} passed`);
  const counts = [];
  if (typeof r.passed_tests === "number")
    counts.push(`${r.passed_tests} passed`);
  if (typeof r.failed_tests === "number")
    counts.push(`${r.failed_tests} failed`);
  if (typeof r.skipped_tests === "number" && r.skipped_tests > 0)
    counts.push(`${r.skipped_tests} skipped`);
  if (typeof r.total_tests === "number")
    counts.push(`${r.total_tests} total`);
  if (counts.length)
    lines.push(`  ${counts.join(", ")}`);
  if (typeof r.errorMessage === "string" && r.errorMessage)
    lines.push(`  ${r.errorMessage}`);
  return lines.join(`
`);
}
function pendingResult(execId, errorMessage) {
  return {
    executionId: execId,
    workflowType: "test_runner",
    repo: "",
    result: { status: "in_progress", ...errorMessage ? { errorMessage } : {} }
  };
}
async function pollUntilTerminal(client, org, execId, opts) {
  const sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const now = opts.now ?? (() => Date.now());
  const deadline = now() + opts.timeoutMs;
  let lastResult;
  let lastError;
  for (;; ) {
    try {
      const result = await client.getExecutionResult(org, execId);
      lastResult = result;
      lastError = undefined;
      const status = String(result.result?.status ?? "");
      if (isTerminalStatus(status))
        return { result, timedOut: false };
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
    if (now() >= deadline) {
      return { result: lastResult ?? pendingResult(execId, lastError), timedOut: true, lastError };
    }
    await sleep(opts.intervalMs);
  }
}
async function fetchAndReport(client, org, execId, opts = {}) {
  const log = opts.log ?? console.log;
  const res = await client.getExecutionResult(org, execId);
  if (opts.json)
    log(JSON.stringify(res));
  else if (opts.yaml)
    log(toYamlString(res));
  else
    log(formatResultSummary(res));
  return exitCodeForStatus(String(res.result?.status ?? ""));
}
async function waitAndReport(client, org, execId, opts) {
  const log = opts.log ?? console.log;
  const { result, timedOut, lastError } = await pollUntilTerminal(client, org, execId, {
    timeoutMs: opts.timeoutMs,
    intervalMs: opts.intervalMs,
    sleep: opts.sleep,
    now: opts.now
  });
  if (opts.json) {
    log(JSON.stringify(result));
  } else if (opts.yaml) {
    log(toYamlString(result));
  } else {
    log(formatResultSummary(result));
    if (timedOut) {
      log(`  timed out after ${Math.round(opts.timeoutMs / 1000)}s waiting for a terminal status`);
      if (lastError)
        log(`  last error while polling: ${lastError}`);
    }
  }
  if (timedOut)
    return 1;
  return exitCodeForStatus(String(result.result?.status ?? ""));
}
function registerRegressionCommand(program2) {
  const regression = program2.command("regression").description("Trigger ShipFlow's server-side regression test_runner. Exercises the project's " + "configured test environment (per-branch testing needs preview deploys — a separate server change).").option("--ref <sha>", "Ref to test (defaults to current HEAD)").option("--preview-url <url>", "Preview-deploy URL to run against (must match the environment previewUrlPatterns allowlist)").option("--wait", "Poll until the run finishes; exit non-zero on failure or timeout").option("--timeout <sec>", "Max seconds to wait with --wait", "600").option("--json", "Output JSON").option("--yaml", "Output YAML").action(runAction(async (opts) => {
    const { creds, client } = loadJwtCtx(program2);
    let ref;
    try {
      ref = resolveRef(opts.ref);
    } catch (e) {
      console.error(`Error: ${e instanceof Error ? e.message : String(e)}`);
      process.exit(1);
    }
    const project = await resolveProject(client, creds);
    const params = { repo: project.repoFullName, ref };
    if (opts.previewUrl)
      params.preview_url = opts.previewUrl;
    const trigger = await client.triggerWorkflow(creds.org, project.projectId, "test_runner", params);
    const execId = trigger.executionId;
    if (!opts.wait) {
      emit(opts, trigger, () => console.log(`Regression run queued: ${execId}`));
      return;
    }
    const timeoutSec = Number(opts.timeout) > 0 ? Number(opts.timeout) : 600;
    if (!opts.json && !opts.yaml)
      console.log(`Regression run queued: ${execId} — waiting up to ${timeoutSec}s...`);
    const code = await waitAndReport(client, creds.org, execId, {
      json: opts.json,
      yaml: opts.yaml,
      timeoutMs: timeoutSec * 1000,
      intervalMs: 5000
    });
    process.exit(code);
  }));
  regression.command("status <executionId>").description("Fetch and print the result of a prior regression run (non-zero exit on failure)").option("--json", "Output JSON").option("--yaml", "Output YAML").action(runAction(async (executionId, opts) => {
    const { creds, client } = loadJwtCtx(program2);
    const code = await fetchAndReport(client, creds.org, executionId, { json: opts.json, yaml: opts.yaml });
    process.exit(code);
  }));
}

// src/commands/features.ts
var GENERATE_DEFAULT_TIMEOUT_SEC = 1200;
var GENERATE_POLL_INTERVAL_MS = 5000;
function printFeatureMap(fm, features, keys) {
  if (!keys.length) {
    console.log("No feature map for this project yet. Run `renaiss-shipflow features generate`.");
    return;
  }
  const byCat = new Map;
  for (const k of keys) {
    const cat = features[k].category || "uncategorized";
    if (!byCat.has(cat))
      byCat.set(cat, []);
    byCat.get(cat).push(k);
  }
  console.log(`\uD83D\uDDFA️  Feature map — ${keys.length} feature(s)${fm.lastUpdated ? ` (updated ${fm.lastUpdated})` : ""}`);
  for (const [cat, ks] of [...byCat].sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`
${cat}`);
    const rows = ks.sort().map((k) => {
      const f = features[k];
      const paths = f.paths ?? [];
      const shown = paths.length ? paths.slice(0, 3).join(", ") + (paths.length > 3 ? " …" : "") : "";
      return [f.name || k, f.test_priority ?? "", shown];
    });
    for (const l of renderTable(["Feature", "Priority", "Paths"], rows))
      console.log(`  ${l}`);
  }
}
function emitMappingOrEmpty(opts, fm) {
  const verdict = verdictForFeatureMapping(fm);
  if (verdict.status === "empty") {
    const envelope = featureMapEmptyEnvelope();
    emit(opts, envelope, () => {
      console.error(`Error: ${envelope.error}`);
    }, { pretty: true });
    process.exit(UNEXPECTED_EXIT_CODE);
  }
  const features = verdict.mapping.features ?? {};
  const keys = Object.keys(features).filter((k) => !opts.category || (features[k].category ?? "") === opts.category);
  const jsonOut = opts.category ? { ...verdict.mapping, features: Object.fromEntries(keys.map((k) => [k, features[k]])), category: opts.category } : verdict.mapping;
  emit(opts, jsonOut, () => {
    if (opts.category && !keys.length) {
      console.log(`No features in category "${opts.category}".`);
      return;
    }
    printFeatureMap(fm, features, keys);
  }, { pretty: true });
}
function flagsFrom(opts, cmd) {
  const g = typeof cmd?.optsWithGlobals === "function" ? cmd.optsWithGlobals() : {};
  return {
    json: Boolean(opts.json || g.json),
    yaml: Boolean(opts.yaml || g.yaml),
    timeout: opts.timeout || g.timeout
  };
}
function registerFeaturesCommand(program2) {
  const features = program2.command("features").description("ShipFlow's feature map for this project (features → file paths/test info) — the reviewer's whole-system view").option("--json", "Output the raw feature map").option("--yaml", "Output YAML").option("--category <name>", "Filter to one category").action(runAction(async (opts) => {
    const { creds, client, project } = await loadCtx(program2);
    const fm = await client.getFeatureMapping(creds.org, project.projectId);
    emitMappingOrEmpty(opts, fm);
  }));
  features.enablePositionalOptions();
  features.command("generate").description("Regenerate the feature map (POST + poll) so the loop is not dashboard-bound").option("--json", "Output JSON").option("--yaml", "Output YAML").option("--timeout <sec>", "Max seconds to wait for generation", String(GENERATE_DEFAULT_TIMEOUT_SEC)).action(runAction(async (opts, cmd) => {
    const flags = flagsFrom(opts, cmd);
    const { creds, client, project } = await loadCtx(program2);
    const trigger = await client.generateFeatureMapping(creds.org, project.projectId);
    const execId = trigger?.executionId;
    if (!execId)
      throw new Error("feature map generate returned no executionId");
    const timeoutSec = Number(flags.timeout) > 0 ? Number(flags.timeout) : GENERATE_DEFAULT_TIMEOUT_SEC;
    if (!flags.json && !flags.yaml) {
      console.log(`Feature map generate queued: ${execId} — waiting up to ${timeoutSec}s...`);
    }
    const { result, timedOut, lastError } = await pollUntilTerminal(client, creds.org, execId, {
      timeoutMs: timeoutSec * 1000,
      intervalMs: GENERATE_POLL_INTERVAL_MS
    });
    const status = String(result?.result?.status ?? "");
    if (timedOut) {
      const error = lastError ? `timed out after ${timeoutSec}s waiting for feature map generation (${lastError})` : `timed out after ${timeoutSec}s waiting for feature map generation`;
      emit(flags, { error, executionId: execId, status: status || "in_progress" }, () => {
        console.error(`Error: ${error}`);
      }, { pretty: true });
      process.exit(1);
    }
    if (status === "failure") {
      const error = String(result?.result?.errorMessage ?? "feature map generation failed");
      emit(flags, { error, executionId: execId, status }, () => {
        console.error(`Error: ${error}`);
      }, { pretty: true });
      process.exit(1);
    }
    const fm = await client.getFeatureMapping(creds.org, project.projectId);
    const verdict = verdictForFeatureMapping(fm);
    if (verdict.status === "empty") {
      const envelope = { ...featureMapEmptyEnvelope(), executionId: execId, status };
      emit(flags, envelope, () => {
        console.error(`Error: ${envelope.error}`);
      }, { pretty: true });
      process.exit(UNEXPECTED_EXIT_CODE);
    }
    const mapping = verdict.mapping;
    const jsonOut = { executionId: execId, status, ...mapping };
    const featureRecord2 = mapping.features ?? {};
    emit(flags, jsonOut, () => {
      console.log(`Feature map generated (${execId})`);
      printFeatureMap(mapping, featureRecord2, Object.keys(featureRecord2));
    }, { pretty: true });
  }));
}

// src/commands/priorities.ts
init_helpers();

// src/priorities.ts
init_sh();
import { existsSync as existsSync4, readFileSync as readFileSync5 } from "node:fs";
import { join as join5 } from "node:path";
var PRIORITIES_DOC_RELPATH = "docs/PRIORITIES.md";
function tableCells(line) {
  const t = line.trim();
  if (!t.startsWith("|") || !t.endsWith("|") || t.length < 2)
    return null;
  return t.slice(1, -1).split("|").map((c) => c.trim());
}
var isDividerRow = (cells) => cells.every((c) => /^:?-{3,}:?$/.test(c));
function parseWorkClasses(markdown) {
  const lines = markdown.split(`
`);
  let inTable = false;
  const classes = [];
  for (const line of lines) {
    const cells = tableCells(line);
    if (!cells) {
      if (inTable && classes.length)
        break;
      inTable = false;
      continue;
    }
    if (!inTable) {
      if (cells.some((c) => c.toLowerCase().replace(/\s+/g, " ").includes("work class")))
        inTable = true;
      continue;
    }
    if (isDividerRow(cells))
      continue;
    const rawRank = cells[0] ?? "";
    if (!/^\d+$/.test(rawRank))
      continue;
    classes.push({
      rank: Number.parseInt(rawRank, 10),
      workClass: cells[1] ?? "",
      wipShare: cells[2] ?? "",
      notes: cells[3] ?? ""
    });
  }
  return classes;
}
function repoRoot() {
  try {
    return _exec("git rev-parse --show-toplevel", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim() || process.cwd();
  } catch {
    return process.cwd();
  }
}
function loadPrioritiesDoc(root = repoRoot()) {
  const path = join5(root, PRIORITIES_DOC_RELPATH);
  if (!existsSync4(path))
    return { found: false, path, classes: [] };
  const classes = parseWorkClasses(readFileSync5(path, "utf8"));
  if (!classes.length) {
    return {
      found: true,
      path,
      classes,
      warning: "doc exists but no ordered work-class table parsed — treat as off-doc (escalate as today)"
    };
  }
  return { found: true, path, classes };
}

// src/commands/priorities.ts
function registerPrioritiesCommand(program2) {
  program2.command("priorities").description(`Standing priorities doc (${PRIORITIES_DOC_RELPATH}) consulted at loop intake — greenlit work classes + WIP share (human-edited only)`).option("--json", "Output the parsed doc as JSON").option("--yaml", "Output YAML").action(runAction(async (opts) => {
    const doc = loadPrioritiesDoc();
    emit(opts, doc, () => {
      if (!doc.found) {
        console.log(`No standing priorities doc at ${PRIORITIES_DOC_RELPATH} — loop intake escalates product-priority sign-off as before.`);
        return;
      }
      if (doc.warning) {
        console.log(`⚠️  ${doc.warning}`);
        console.log(`   ${doc.path}`);
        return;
      }
      console.log(`\uD83D\uDCCB Standing priorities — ${doc.classes.length} greenlit work class(es) (${PRIORITIES_DOC_RELPATH}, human-edited only)`);
      const rows = doc.classes.map((c) => [String(c.rank), c.workClass, c.wipShare, c.notes]);
      for (const l of renderTable(["#", "Work class", "WIP share", "Notes"], rows))
        console.log(`  ${l}`);
      console.log(`
Greenlit class + normal slice → intake may proceed; deploy-blast-radius work ALWAYS needs per-item sign-off; off-doc work escalates as today (#211).`);
    }, { pretty: true });
  }));
}

// src/commands/config.ts
init_config();
init_helpers();
var MERGE_POLICIES2 = ["manual", "auto-on-green", "auto-timeout"];
var SETTINGS = [
  {
    key: "auto-issue",
    field: "autoIssue",
    set: (v, c) => String(c.autoIssue = parseBoolStrict("auto-issue", v)),
    effective: resolveAutoIssue
  },
  {
    key: "live-reload",
    field: "liveReload",
    set: (v, c) => String(c.liveReload = parseBoolStrict("live-reload", v)),
    effective: resolveLiveReload
  },
  {
    key: "require-ci",
    field: "requireCi",
    set: (v, c) => String(c.requireCi = parseBoolStrict("require-ci", v)),
    effective: resolveRequireCi
  },
  {
    key: "merge-policy",
    field: "mergePolicy",
    set: (v, c) => {
      const p = v.trim();
      if (!MERGE_POLICIES2.includes(p))
        throw new Error(`merge-policy must be one of: ${MERGE_POLICIES2.join(", ")}`);
      return c.mergePolicy = p;
    },
    effective: resolveMergePolicy
  },
  {
    key: "max-fix-attempts",
    field: "maxFixAttempts",
    set: (v, c) => String(c.maxFixAttempts = parseIntStrict("max-fix-attempts", v)),
    effective: resolveMaxFixAttempts
  },
  {
    key: "wip-limit",
    field: "wipLimit",
    set: (v, c) => String(c.wipLimit = parseIntStrict("wip-limit", v)),
    effective: resolveWipLimit
  },
  {
    key: "stale-pr-hours",
    field: "stalePrHours",
    set: (v, c) => String(c.stalePrHours = parseIntStrict("stale-pr-hours", v)),
    effective: resolveStalePrHours
  },
  {
    key: "bug-hunt",
    field: "bugHunt",
    set: (v, c) => String(c.bugHunt = parseBoolStrict("bug-hunt", v)),
    effective: resolveBugHunt
  },
  {
    key: "bug-hunt-cap",
    field: "bugHuntCap",
    set: (v, c) => String(c.bugHuntCap = parseIntStrict("bug-hunt-cap", v)),
    effective: resolveBugHuntCap
  },
  {
    key: "require-review",
    field: "requireReview",
    set: (v, c) => String(c.requireReview = parseBoolStrict("require-review", v)),
    effective: resolveRequireReview
  },
  {
    key: "signoff-owner",
    field: "signoffOwner",
    set: (v, c) => c.signoffOwner = v.trim().replace(/^@/, ""),
    effective: resolveSignoffOwner
  },
  {
    key: "conflict-sweep",
    field: "conflictSweep",
    set: (v, c) => String(c.conflictSweep = parseBoolStrict("conflict-sweep", v)),
    effective: resolveConflictSweep
  },
  {
    key: "pickup-scope",
    field: "pickupScope",
    set: (v, c) => {
      const m = v.trim();
      if (!PICKUP_SCOPES.includes(m))
        throw new Error(`pickup-scope must be one of: ${PICKUP_SCOPES.join(", ")}`);
      return c.pickupScope = m;
    },
    effective: resolvePickupScope
  },
  {
    key: "intent-gate",
    field: "intentGate",
    set: (v, c) => {
      const m = v.trim();
      if (!INTENT_GATE_MODES.includes(m))
        throw new Error(`intent-gate must be one of: ${INTENT_GATE_MODES.join(", ")}`);
      return c.intentGate = m;
    },
    effective: resolveIntentGateMode
  },
  {
    key: "intake-approval",
    field: "intakeApproval",
    set: (v, c) => {
      const m = v.trim().toLowerCase();
      if (!INTAKE_APPROVAL_MODES.includes(m))
        throw new Error(`intake-approval must be one of: ${INTAKE_APPROVAL_MODES.join(", ")}`);
      return c.intakeApproval = m;
    },
    effective: resolveIntakeApproval
  },
  {
    key: "loop-worker-model",
    field: "loopWorkerModel",
    set: (v, c) => c.loopWorkerModel = v.trim(),
    effective: resolveLoopWorkerModel
  },
  {
    key: "cli-drift-poll-seconds",
    field: "cliDriftPollSeconds",
    set: (v, c) => String(c.cliDriftPollSeconds = parseIntStrict("cli-drift-poll-seconds", v)),
    effective: resolveCliDriftPollSeconds
  },
  {
    key: "app-slug",
    field: "appSlug",
    set: (v, c) => {
      const s = v.trim().replace(/^@/, "");
      if (!isValidAppSlug(s))
        throw new Error(`app-slug must be a GitHub App slug (letters, digits, single hyphens), got: ${v}`);
      return c.appSlug = s;
    },
    effective: () => resolveIntentGateAuditAuthorSlug().slug
  }
];
var byKey = new Map(SETTINGS.map((s) => [s.key, s]));
var KEYS = SETTINGS.map((s) => s.key);
function unknownKey(key, json) {
  const message = `Unknown key: ${key} (supported: ${KEYS.join(", ")})`;
  if (json)
    console.log(JSON.stringify({ error: message }));
  else
    console.error(message);
  process.exit(1);
}
function registerConfigCommand(program2) {
  const config = program2.command("config").description("Get/set ShipFlow CLI preferences");
  config.command("set <key> <value>").description(`Set a preference. Keys: ${KEYS.join(", ")}`).option("--json", "Output JSON").option("--yaml", "Output YAML").action(runAction((key, value, opts) => {
    const s = byKey.get(key) ?? unknownKey(key, opts.json);
    const cfg = loadConfig();
    let echo;
    try {
      echo = s.set(value, cfg);
    } catch (e) {
      if (opts.json) {
        console.log(JSON.stringify({ error: e.message }));
      } else {
        console.error(e.message);
      }
      process.exit(1);
    }
    saveConfig(cfg);
    emit(opts, { [s.field]: s.effective() ?? null }, () => console.log(`${key} = ${echo}`));
  }));
  config.command("get <key>").description("Read a preference (env vars override stored config)").option("--json", "Output JSON").option("--yaml", "Output YAML").action(runAction((key, opts) => {
    const s = byKey.get(key) ?? unknownKey(key, opts.json);
    const v = s.effective();
    emit(opts, { [s.field]: v ?? null }, () => console.log(v === undefined ? "unset" : String(v)));
  }));
  config.command("list").description("Show all preferences (effective values)").option("--json", "Output JSON").option("--yaml", "Output YAML").action(runAction((opts) => {
    const obj = {};
    for (const s of SETTINGS)
      obj[s.field] = s.effective() ?? null;
    emit(opts, obj, () => {
      const rows = SETTINGS.map((s) => {
        const v = s.effective();
        return [s.key, v === undefined ? "unset" : String(v)];
      });
      for (const l of renderTable(["Key", "Value"], rows))
        console.log(l);
    }, { pretty: true });
  }));
}

// src/commands/claims.ts
init_helpers();
function registerClaimsCommand(program2) {
  program2.command("claims").description("List active agent claims (who is working on what)").option("--json", "Output JSON").option("--yaml", "Output YAML").action(runAction(async (opts) => {
    const { creds, client, project } = await loadCtx(program2);
    const claims = await client.listClaims(creds.org, project.projectId);
    emit(opts, { claims }, () => {
      if (claims.length === 0) {
        console.log("No active claims — every open issue is up for grabs.");
        return;
      }
      const rows = claims.map((c) => [
        `#${c.issueNumber}`,
        c.repo,
        c.agent ? `${c.actor} (${c.agent})` : c.actor,
        c.expiresAt
      ]);
      for (const l of renderTable(["Issue", "Repo", "Actor", "Expires"], rows))
        console.log(l);
    }, { pretty: true });
  }));
}

// src/commands/capability.ts
init_helpers();
var CAPABILITY_CLASSES = ["capability", "access", "secret", "policy"];
var CAPABILITY_STATUSES = ["open", "granted", "declined"];
function registerCapabilityCommand(program2) {
  const capability = program2.command("capability").description("Standing queue for capabilities/access/secrets/policy the agent can't grant itself");
  capability.command("request").description("File a capability request into the standing queue").requiredOption("--class <class>", `One of: ${CAPABILITY_CLASSES.join(" | ")}`).requiredOption("--title <title>", "Short summary of the ask").requiredOption("--why <why>", "Why the agent needs it (the blocker it unblocks)").option("--issue <number>", "Escalating issue number this ask came from").option("--repo <fullname>", "Repo the ask is scoped to (default: the active project's)").option("--json", "Output JSON").option("--yaml", "Output YAML").action(runAction(async (opts) => {
    if (!CAPABILITY_CLASSES.includes(opts.class)) {
      throw new Error(`invalid --class ${opts.class}; expected one of ${CAPABILITY_CLASSES.join(", ")}`);
    }
    const { creds, client, project } = await loadCtx(program2);
    const issueNumber = opts.issue ? parseInt(opts.issue, 10) : undefined;
    if (opts.issue && Number.isNaN(issueNumber))
      throw new Error(`invalid --issue ${opts.issue}`);
    const created = await client.createCapabilityRequest(creds.org, project.projectId, {
      class: opts.class,
      title: opts.title,
      why: opts.why,
      repo: opts.repo ?? project.repoFullName,
      issueNumber
    });
    emit(opts, created, () => {
      console.log(`Filed ${created.class} request ${created.id} (${created.status}): ${created.title}`);
    }, { pretty: true });
  }));
  capability.command("list").description("List capability requests in the standing queue (newest first)").option("--status <status>", `Filter by status: ${CAPABILITY_STATUSES.join(" | ")}`).option("--json", "Output JSON").option("--yaml", "Output YAML").action(runAction(async (opts) => {
    if (opts.status && !CAPABILITY_STATUSES.includes(opts.status)) {
      throw new Error(`invalid --status ${opts.status}; expected one of ${CAPABILITY_STATUSES.join(", ")}`);
    }
    const { creds, client, project } = await loadCtx(program2);
    const requests = await client.listCapabilityRequests(creds.org, project.projectId, opts.status);
    emit(opts, { capabilityRequests: requests }, () => {
      if (requests.length === 0) {
        console.log("No capability requests — the queue is clear.");
        return;
      }
      const rows = requests.map((c) => [
        c.id,
        c.class,
        c.status,
        c.issueNumber ? `#${c.issueNumber}` : "—",
        c.title
      ]);
      for (const l of renderTable(["ID", "Class", "Status", "Issue", "Title"], rows))
        console.log(l);
    }, { pretty: true });
  }));
}

// src/commands/test.ts
init_project();
init_sh();
init_helpers();
import { existsSync as existsSync5, readFileSync as readFileSync6 } from "node:fs";
import { join as join6 } from "node:path";
function registerTestCommand(program2) {
  program2.command("test").description("Run the project's local test command (auto-detected)").option("--json", "Emit a machine-readable summary line (runner + exit code); test output still streams").option("--yaml", "Output YAML").allowUnknownOption().action((opts) => {
    const root = getCwdRepoRoot();
    if (!root) {
      if (opts.json)
        console.log(JSON.stringify({ error: "Not in a git repo." }));
      else
        console.error("Not in a git repo.");
      process.exit(1);
    }
    const runner = detectRunner(root);
    if (!runner) {
      if (opts.json)
        console.log(JSON.stringify({ error: "Could not detect a test runner." }));
      else
        console.error("Could not detect a test runner. Run your test command manually.");
      process.exit(2);
    }
    const command = [runner.cmd, ...runner.args].join(" ");
    if (!opts.json && !opts.yaml)
      console.log(`> ${command}`);
    const code = runRunner(runner, root);
    emit(opts, { runner: command, source: runner.source, exitCode: code, passed: code === 0 }, () => {});
    process.exit(code);
  });
}
function runRunner(runner, root) {
  const r = _spawn(runner.cmd, runner.args, {
    stdio: "inherit",
    cwd: root,
    timeout: 15 * 60000,
    shell: process.platform === "win32"
  });
  if (r.error) {
    const detail = r.error.code === "ENOENT" ? `'${runner.cmd}' not found on PATH` : `'${runner.cmd}' failed to start: ${r.error.message}`;
    console.error(`error: ${detail} (detected from ${runner.source}). Install it or run your test command manually.`);
    return 127;
  }
  return r.status ?? 1;
}
function hasTestScript(root) {
  try {
    const pkg = JSON.parse(readFileSync6(join6(root, "package.json"), "utf8"));
    return typeof pkg?.scripts?.test === "string" && pkg.scripts.test.trim() !== "";
  } catch {
    return false;
  }
}
function detectRunner(root) {
  if (existsSync5(join6(root, "package.json"))) {
    const bunArgs = hasTestScript(root) ? ["run", "test"] : ["test"];
    if (existsSync5(join6(root, "bun.lockb")))
      return { cmd: "bun", args: bunArgs, source: "bun.lockb" };
    if (existsSync5(join6(root, "bun.lock")))
      return { cmd: "bun", args: bunArgs, source: "bun.lock" };
    if (existsSync5(join6(root, "pnpm-lock.yaml")))
      return { cmd: "pnpm", args: ["test"], source: "pnpm-lock.yaml" };
    if (existsSync5(join6(root, "yarn.lock")))
      return { cmd: "yarn", args: ["test"], source: "yarn.lock" };
    return { cmd: "npm", args: ["test"], source: "package.json" };
  }
  if (existsSync5(join6(root, "go.mod")))
    return { cmd: "go", args: ["test", "./..."], source: "go.mod" };
  if (existsSync5(join6(root, "Cargo.toml")))
    return { cmd: "cargo", args: ["test"], source: "Cargo.toml" };
  if (existsSync5(join6(root, "pyproject.toml")))
    return { cmd: "pytest", args: [], source: "pyproject.toml" };
  if (existsSync5(join6(root, "pytest.ini")))
    return { cmd: "pytest", args: [], source: "pytest.ini" };
  return null;
}

// src/commands/release.ts
init_prompts();
init_helpers();
import { execSync as execSync7 } from "node:child_process";
function registerReleaseCommand(program2) {
  program2.command("release").description("Trigger a ShipFlow release (patch_notes + regression + downstream workflows)").option("--tag <tag>", "Release tag (e.g. v0.7.3)").option("--base-tag <tag>", "Previous tag (auto-detect if omitted)").option("--env <env>", "Target environment (staging|prod)").option("--wait", "Block and stream status until terminal").option("--json", "Output JSON").option("--yaml", "Output YAML").action(runAction(async (opts) => {
    const { creds, client, project } = await loadCtx(program2);
    const tag = opts.tag ?? await promptText("Tag (e.g. v0.7.3): ");
    const baseTag = opts.baseTag ?? safeLatestTag();
    const result = await client.triggerRelease(creds.org, project.projectId, {
      repo: project.repoFullName,
      tag,
      baseTag,
      env: opts.env
    });
    emit(opts, result, () => {
      console.log(`Release queued: ${result.releaseRunId}`);
      console.log(`Workflows: ${result.workflowRunIds.join(", ")}`);
      if (opts.wait) {
        console.log("(--wait not yet implemented; check the dashboard for status.)");
      }
    });
  }));
}
function safeLatestTag() {
  try {
    return execSync7("git describe --tags --abbrev=0", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return;
  }
}

// src/commands/profile.ts
init_config();
init_helpers();
function rows() {
  const active = activeProfile();
  return ["", ...listProfiles()].map((name) => {
    const creds = credentialsForProfile(name);
    return {
      profile: name,
      active: name === active,
      signedIn: !!creds?.jwt,
      org: creds?.org ?? "",
      tenantId: creds?.tenantId ?? ""
    };
  });
}
function registerProfilesCommand(program2) {
  const profiles = program2.command("profiles").description("List config profiles (isolated credentials per tenant)").option("--json", "Output JSON").option("--yaml", "Output YAML").action(runAction((opts) => {
    const active = activeProfile();
    const data = rows();
    emit(opts, { active: active || null, dir: configDir(), profiles: data }, () => {
      console.log(`Active profile: ${active || "(default)"}`);
      console.log(`Config dir:     ${configDir()}`);
      console.log("");
      const tableRows = data.map((r) => [
        `${r.active ? "*" : " "} ${r.profile || "(default)"}`,
        r.signedIn ? "yes" : "no",
        r.org || "—",
        r.tenantId || "—"
      ]);
      for (const l of renderTable(["Profile", "Signed in", "Org", "Tenant"], tableRows))
        console.log(l);
      if (data.filter((r) => r.signedIn).length < 2) {
        console.log("");
        console.log("Add a tenant in its own store:");
        console.log("  renaiss-shipflow --profile <name> login   (or SHIPFLOW_PROFILE=<name> renaiss-shipflow login)");
      }
    }, { pretty: true });
  }));
  profiles.command("dir").description("Print the active config directory (honors --profile / SHIPFLOW_PROFILE / SHIPFLOW_CONFIG_DIR)").action(runAction(() => {
    console.log(configDir());
  }));
}

// src/index.ts
var pkg = createRequire3(import.meta.url)("../package.json");
var program2 = new Command;
program2.name("renaiss-shipflow").description("CLI for RenaissShipFlow - AI-powered project management automation").version(pkg.version).option("--api-url <url>", "RenaissShipFlow API base URL").option("--org <org>", 'Organization slug (default: "default")', "default").option("--profile <name>", "Config profile — isolated credentials per tenant (also SHIPFLOW_PROFILE)");
program2.hook("preAction", () => {
  const p = program2.opts().profile;
  if (p)
    process.env.SHIPFLOW_PROFILE = p;
});
registerAuthCommands(program2);
registerRepoCommands(program2);
registerWorkflowCommands(program2);
registerActivityCommand(program2);
registerChannelCommands(program2);
registerStatsCommand(program2);
registerTriggerCommand(program2);
registerLoginCommand(program2);
registerGitIdentityCommand(program2);
registerInitCommand(program2);
registerStatusCommand(program2);
registerVersionCommand(program2, pkg.version);
registerIssuesCommand(program2);
registerIssueCommand(program2);
registerIntakeCommand(program2);
registerInboxCommand(program2);
registerLoopCommand(program2);
registerFeaturesCommand(program2);
registerPrioritiesCommand(program2);
registerConfigCommand(program2);
registerClaimsCommand(program2);
registerCapabilityCommand(program2);
registerPRCommand(program2);
registerTestCommand(program2);
registerRegressionCommand(program2);
registerReleaseCommand(program2);
registerProfilesCommand(program2);
program2.parse();
