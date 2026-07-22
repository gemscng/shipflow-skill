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

// src/index.ts
import { createRequire as createRequire2 } from "node:module";

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

// src/config.ts
import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { createHash } from "node:crypto";

// src/shipflow-contract-data.ts
var SHIPFLOW_CONTRACT = {
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
    $comment: "ShipFlow's GitHub label palette + the lifecycle label NAMES. `colors` maps a label name to its 6-hex color; ShipFlow owns these colors and BOTH the server's ensureLabels and the CLI's ghEnsureLabel source this ONE map (pre-contract they were byte-identical copies, so a color edit on one side flip-flopped the label). `prefixColors` colors open-ended label groups by name prefix. `names` are the lifecycle labels the code references by MEANING (claim / escalation / approval / reporter-review / verify-failed); every `names` value is also a `colors` key (parity-tested). `verifyFailed` is applied by the post-deploy verifier when a PR's verification manifest has a failing assertion (issue #207) — it hooks the reporter ping and the follow-up auto-revert. `autoHarvested` marks issues the cross-reviewer finding harvester files from valid findings OTHER PR reviewers (gemini-code-assist, chatgpt-codex-connector) raised and ShipFlow missed (part of #56). Repaint/matching semantics stay per-consumer — only the literals are shared.",
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
      needsHuman: "needs-human",
      shipflowApproved: "shipflow-approved",
      verifyFailed: "verify-failed",
      viaShipflow: "via-shipflow",
      autoHarvested: "auto-harvested",
      waitingOn: "⏳ waiting-on"
    }
  },
  markers: {
    $comment: "Hidden issue-lifecycle markers + the escalation-banner literals. `triaged` is stamped on every ShipFlow-created issue so the issues.opened webhook suppresses the redundant AI Issue Triage pass (server domain.IssueAutoTriagedMarker + CLI ghIssueCreate). `loop` marks loop-progress comments — matched by the server's needs-human auto-unblock, written by the loop per the skill contract. `interpretationNote` is the deliberate-reinterpretation flag a worker embeds in a PR body when it ships an off-brief reading of the ask (issue #190): the CLI intent gate (`pr automerge`/`pr ready`, via packet.hasInterpretationSignal) treats its presence as a first-class merge blocker so the human reporter confirms before it reaches production, and the server companion pings the reporter on the resulting needs-reporter-review label. `escalationBannerEmoji` (\uD83D\uDEA7) is what the server matches with a LOOSE HasPrefix (legacy comments depend on it). `escalationBannerHeading` is the stricter prefix the CLI matches with startsWith AND the opening of the CLI's rendered banner; it MUST start with escalationBannerEmoji (parity-tested), so a CLI-posted banner always satisfies the server's loose match. `verificationManifestHeading` is the section heading text a PR author uses to declare post-deploy verification assertions (issue #207); the server matches it tolerantly (case-insensitive, ignoring leading `#` and trailing punctuation) to extract the manifest, then posts its verdict comment stamped with `verificationComment`. `precedentContext` and `precedentApplied` are the decision-precedent-store markers (issue #210, slice 3). `precedentContext` is a HIDDEN OPEN-TOKEN the CLI appends to every `issue escalate` banner carrying the raw ask so the server's webhook capture can fingerprint the exact same text a later `precedents/match` lookup will — rendered as `<!-- shipflow:precedent-context cat=<category> q=<base64(reason)> -->` (the `cat=`/`q=` attributes are the CLI→server convention). `precedentApplied` is the OPEN-TOKEN on the auto-application disclosure comment (`\uD83D\uDD01 Auto-resolved per your #N decision`), rendered as `<!-- shipflow:precedent-applied pid=<id> -->`; the server's undo watcher matches it with a loose Contains and reads `pid=` to know which precedent a one-word `undo`/`no` reply reverses, and `commentIsLoopMachinery` learns it so a disclosure can never itself clear needs-human/needs-reporter-review. Both are OPEN tokens (no trailing `-->` in the literal) matched with Contains, like the escalation-banner emoji is matched with HasPrefix — the render closes the tag after the attributes. Do NOT change these matching semantics — only the literals are single-sourced.",
    triaged: "<!-- shipflow:triaged -->",
    loop: "<!-- shipflow:loop -->",
    interpretationNote: "<!-- shipflow:interpretation -->",
    escalationBannerEmoji: "\uD83D\uDEA7",
    escalationBannerHeading: "\uD83D\uDEA7 **Needs a human**",
    verificationManifestHeading: "Verification manifest",
    verificationComment: "<!-- shipflow:verification -->",
    precedentContext: "<!-- shipflow:precedent-context",
    precedentApplied: "<!-- shipflow:precedent-applied"
  },
  readability: {
    $comment: "Deterministic message-readability cap shared across GitHub surfaces: any single line that renders UNFOLDED over this many words is dense prose, not a scannable point — its detail belongs in a folded section. Enforced by the server's readability.VisibleLineWordCap (PR review + triage rendering) and the CLI's ACTION_LINE_WORD_LIMIT (loop escalation lint). ~20-word sentences plus room for a code reference.",
    visibleLineWordCap: 30
  }
};

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
var ESCALATION_CATEGORIES = {
  "money-write": "Enabling this writes real money-bearing values (prices, payouts, billing) to live systems. " + "A bad value reaches customers immediately, and transactions made at a wrong value can't be " + "undone by reverting data. The loop never self-authorizes money writes — a human owns the go/no-go.",
  "prod-config": "This changes production configuration (env vars, flags, infrastructure) whose blast radius " + "spans everything behind it; a mistake can take production down or silently change live " + "behavior. The loop never applies production config itself.",
  security: "This touches a security- or trust-critical surface (authn/authz, secrets, injection-prone " + "parsing) where a mistake is exploitable and autonomous validation can't establish safety.",
  "missing-secret": "The work is blocked on a credential, secret, or account only a human can provision. Nothing " + "is wrong with the code — the loop lacks access it cannot grant itself.",
  "external-dependency": "Blocked on an external system or third party (vendor approval, DNS, a service outside this " + "repo) that the loop cannot drive.",
  invalid: "The issue looks invalid, duplicate, or out of scope; closing someone's issue is a judgment " + "call the loop leaves to a human."
};
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
  const rendered = sections.map((s) => {
    const body = s.lines.join(`
`).trim();
    if (s.heading === null)
      return body;
    const visible = anyAction ? isActionHeading(s.heading) : firstHeaded;
    firstHeaded = false;
    if (visible)
      return `### ${s.heading}
${body}`;
    return `<details>
<summary><b>${s.heading}</b></summary>

${body}

</details>`;
  }).filter(Boolean);
  return rendered.join(`

`);
}
function normalizeOwner(raw) {
  const login = (raw ?? "").trim().replace(/^@/, "");
  return login || undefined;
}
var ACTION_LINE_WORD_LIMIT = SHIPFLOW_CONTRACT.readability.visibleLineWordCap;
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
  if (r.includes(`
`) && !r.split(`
`).some((l) => /^###\s/.test(l) && isActionHeading(l))) {
    problems.push('structured reason is missing the "### \uD83D\uDC64 Action needed" section — lead with the concrete steps');
  }
  for (const line of overlongActionLines(r)) {
    problems.push(`"Action needed" line over ${ACTION_LINE_WORD_LIMIT} words ("${line.slice(0, 60)}…") — ` + `a step (or table cell) must read in one breath; move the detail to "### Why it's blocked" (it renders folded)`);
  }
  return problems;
}
function encodePrecedentContext(category, reason) {
  const q = Buffer.from(reason, "utf8").toString("base64");
  return `${SHIPFLOW_CONTRACT.markers.precedentContext} cat=${category} q=${q} -->`;
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
    `On #${p.sourceIssue}, @${p.author} answered: "${p.answer}" ([original reply](${p.sourceUrl})).`,
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
  return [
    `\uD83D\uDD01 **Auto-resolved per your #${p.sourceIssue} decision** — reply \`undo\` to reverse it.`,
    "",
    `**Decision reused:** "${p.answer}" — @${p.author}, [original reply](${p.sourceUrl})`,
    "",
    "<details>",
    `<summary><b>What was auto-applied — ${m.category}</b></summary>`,
    "",
    `**Matched precedent:** \`${m.fingerprint}\` · reuse ${p.reuseCount} · expires ${p.expiresAt.slice(0, 10)}`,
    "**Undo:** one reply `undo` (or `no`) reverses this, retires the precedent, and re-escalates the question to you.",
    "",
    "</details>",
    `${SHIPFLOW_CONTRACT.markers.precedentApplied} pid=${p.id} cat=${m.category} -->`
  ].join(`
`);
}
var ESCALATION_BANNER = `${SHIPFLOW_CONTRACT.markers.escalationBannerHeading} — the loop is parked here until you reply.`;
function findLatestEscalationComment(comments) {
  for (let i = comments.length - 1;i >= 0; i--) {
    const c = comments[i];
    if (c.viewerDidAuthor === false)
      continue;
    if (c.body.trimStart().startsWith(SHIPFLOW_CONTRACT.markers.escalationBannerHeading))
      return c;
  }
  return null;
}
function formatEscalationBody(reason, opts = {}) {
  if (opts.category && !(opts.category in ESCALATION_CATEGORIES)) {
    throw new Error(`Unknown escalation category "${opts.category}" — valid: ${Object.keys(ESCALATION_CATEGORIES).join(", ")}`);
  }
  const why = foldSecondarySections(bulletizeReason(reason.trim())) || "_No reason given._";
  const owner = normalizeOwner(opts.owner);
  return [
    ESCALATION_BANNER,
    "",
    ...owner ? [`**Owner:** @${owner}`, ""] : [],
    why,
    "",
    ...opts.category ? [
      "<details>",
      `<summary><b>Why a human must decide — ${opts.category}</b></summary>`,
      "",
      ESCALATION_CATEGORIES[opts.category],
      "",
      "</details>",
      ""
    ] : [],
    "---",
    `<sub>Reply with your decision (\`1: <answer>\` per numbered item works) — the **\`${SHIPFLOW_CONTRACT.labels.names.needsHuman}\`** label clears automatically and the loop resumes.</sub>`,
    ...opts.category ? [encodePrecedentContext(opts.category, reason.trim())] : []
  ].join(`
`);
}

// src/config.ts
var DEFAULT_BASE = join(homedir(), ".config", "renaissshipflow");
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
var configFile = () => join(configDir(), "config.json");
var credsFile = () => join(configDir(), "credentials.json");
var projectsFile = () => join(configDir(), "projects.json");
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
var MERGE_POLICIES = ["manual", "auto-on-green", "auto-timeout"];
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
var loadConfig = () => readJsonOr(configFile(), {});
var saveConfig = (c) => writeJson(configFile(), c);
var clearConfig = () => {
  try {
    unlinkSync(configFile());
  } catch {}
};
var loadCredentials = () => readJsonOr(credsFile(), null);
var saveCredentials = (c) => writeJson(credsFile(), c);
function refreshOpts(creds) {
  return {
    refreshToken: creds.refreshToken,
    onRefreshed: (t) => saveCredentials({ ...creds, jwt: t.token, refreshToken: t.refreshToken, expiresAt: t.expiresAt })
  };
}
var loadProjectCache = () => readJsonOr(projectsFile(), {});
var saveProjectCache = (c) => writeJson(projectsFile(), c);
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

// src/commands/auth.ts
function registerAuthCommands(program2) {
  const auth = program2.command("auth").description("Manage authentication");
  auth.command("login").description("[deprecated] Authenticate with an API key — prefer `renaiss-shipflow login`").argument("[api-key]", "API key (sfk_...)").action(async (apiKey) => {
    if (!apiKey) {
      const { createInterface } = await import("node:readline");
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      apiKey = await new Promise((resolve) => {
        rl.question("Enter your RenaissShipFlow API key (sfk_...): ", (answer) => {
          rl.close();
          resolve(answer.trim());
        });
      });
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
  });
  auth.command("logout").description("Clear stored credentials").action(() => {
    clearConfig();
    console.log("Logged out. Stored credentials cleared.");
  });
  auth.command("status").description("Show current authentication status").action(() => {
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
  });
}

// src/client.ts
class ApiError extends Error {
  status;
  body;
  constructor(status, body) {
    super(`API error ${status}: ${body}`);
    this.status = status;
    this.body = body;
    this.name = "ApiError";
  }
}

class ClaimConflictError extends Error {
  holder;
  constructor(holder) {
    super(holder ? `issue claimed by ${holder.actor}${holder.agent ? ` (${holder.agent})` : ""} until ${holder.expiresAt}` : "issue already claimed");
    this.holder = holder;
    this.name = "ClaimConflictError";
  }
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
  async refreshJWT(refreshToken) {
    return this.request("POST", `/api/v1/auth/refresh`, { refreshToken });
  }
  async getRepoByFullName(org, owner, repo) {
    return this.request("GET", `/api/v1/orgs/${encodeURIComponent(org)}/repos/by-fullname/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
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
    appendAll("images", opts.images);
    const res = await this.fetchWithRefresh(`${this.baseUrl}/api/v1/orgs/${encodeURIComponent(org)}/projects/${encodeURIComponent(projectId)}/issues/${number}/evidence`, { method: "POST", body: form });
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
}

// src/project.ts
import { execSync } from "node:child_process";
import { resolve } from "node:path";

// src/prompts.ts
import { createInterface } from "node:readline";
async function promptText(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => {
    rl.question(question, (a) => {
      rl.close();
      res(a.trim());
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

// src/project.ts
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
async function resolveProject(client, creds) {
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
  if (cache[cacheKey])
    return { ...cache[cacheKey], repoFullName };
  const lookup = await client.getRepoByFullName(creds.org, remote.owner, remote.repo);
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
  return { ...entry, repoFullName };
}

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
function emit(opts, jsonValue, humanPrint, { pretty = false } = {}) {
  if (opts.json) {
    console.log(pretty ? JSON.stringify(jsonValue, null, 2) : JSON.stringify(jsonValue));
    return;
  }
  humanPrint();
}
function getOrg(cmd) {
  return cmd.optsWithGlobals().org || "default";
}
function getFormat(cmd) {
  const opts = cmd.opts();
  if (opts.json)
    return "json";
  if (opts.yaml)
    return "yaml";
  return "table";
}
var UNEXPECTED_EXIT_CODE = 10;
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
      process.exit(UNEXPECTED_EXIT_CODE);
    }
  };
}

// src/output.ts
function printJson(data) {
  console.log(JSON.stringify(data, null, 2));
}
function printYaml(data) {
  console.log(toYaml(data, 0));
}
function toYaml(value, indent) {
  const prefix = "  ".repeat(indent);
  if (value === null || value === undefined)
    return "null";
  if (typeof value === "string")
    return value.includes(`
`) ? `|
${value.split(`
`).map((l) => prefix + "  " + l).join(`
`)}` : value;
  if (typeof value === "number" || typeof value === "boolean")
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
      return `${prefix}- ${inner}`;
    }).join(`
`);
  }
  if (typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0)
      return "{}";
    return entries.map(([k, v]) => {
      const inner = toYaml(v, indent + 1);
      if (typeof v === "object" && v !== null) {
        return `${prefix}${k}:
${inner}`;
      }
      return `${prefix}${k}: ${inner}`;
    }).join(`
`);
  }
  return String(value);
}
function printTable(headers, rows) {
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] || "").length)));
  const sep = widths.map((w) => "-".repeat(w + 2)).join("+");
  const formatRow = (row) => row.map((cell, i) => ` ${(cell || "").padEnd(widths[i])} `).join("|");
  console.log(formatRow(headers));
  console.log(sep);
  rows.forEach((row) => console.log(formatRow(row)));
}
function formatOutput(format, data, tableFormatter) {
  switch (format) {
    case "json":
      printJson(data);
      break;
    case "yaml":
      printYaml(data);
      break;
    case "table":
      tableFormatter();
      break;
  }
}

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
  repos.command("show").description("Show details for a specific repository").argument("<repo>", "Repository name").option("--json", "Output as JSON").option("--yaml", "Output as YAML").action(runAction(async (repo, _opts, cmd) => {
    const { client, org, format } = getApiCtx(cmd);
    const data = await client.getRepo(org, repo);
    formatOutput(format, data, () => {
      console.log(`Repository: ${data.fullName}`);
      console.log(`  Active: ${data.isActive ? "yes" : "no"}`);
      console.log(`  URL: ${data.htmlUrl}`);
      console.log(`  Created: ${data.createdAt}`);
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
  const pct = Math.round(read / tokensIn * 100);
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
function registerTriggerCommand(program2) {
  program2.command("trigger").description("Manually trigger a workflow").argument("<workflow-type>", "Workflow type to trigger (e.g. regression_tests)").requiredOption("--repo <repo>", "Repository name").option("--json", "Output JSON").action(runAction(async (workflowType, opts, cmd) => {
    const { client, org } = getApiCtx(cmd);
    await client.updateWorkflow(org, opts.repo, workflowType, {
      settings: { _trigger: true }
    });
    emit(opts, { workflowType, repo: opts.repo, triggered: true }, () => console.log(`Workflow "${workflowType}" triggered on ${opts.repo}.`));
  }));
}

// src/sh.ts
import { execSync as execSync2, spawnSync } from "node:child_process";
var EXEC_TIMEOUT_MS = 120000;
var EXEC_MAX_BUFFER = 16 * 1024 * 1024;
var withDefaults = (options) => ({ timeout: EXEC_TIMEOUT_MS, maxBuffer: EXEC_MAX_BUFFER, ...options });
var execImpl = execSync2;
var spawnImpl = spawnSync;
var _exec = (cmd, options) => execImpl(cmd, withDefaults(options));
var _spawn = (cmd, args, options) => spawnImpl(cmd, args ?? [], withDefaults(options));
function shellQuote(s) {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

// src/gh.ts
var FIELDS = "number,title,body,state,labels,assignees,url,createdAt";
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
function ghIssueOrPrState(repo, number) {
  try {
    const out = _exec(`gh api ${shellQuote(`repos/${repo}/issues/${number}`)} --jq .state`).toString().trim();
    return out === "open" || out === "closed" ? out : null;
  } catch {
    return null;
  }
}
var SHIPFLOW_TRIAGED_MARKER = SHIPFLOW_CONTRACT.markers.triaged;
var VIA_SHIPFLOW_LABEL = SHIPFLOW_CONTRACT.labels.names.viaShipflow;
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
function ghIssueList(repo, state = "open", limit = 30) {
  const out = _exec(`gh issue list --repo ${shellQuote(repo)} --state ${state} --limit ${limit} --json ${FIELDS}`).toString();
  return JSON.parse(out);
}
var DETAIL_FIELDS = `${FIELDS},author,milestone,updatedAt,closedAt`;
function ghIssueListFiltered(repo, f = {}) {
  const parts = [
    "gh issue list",
    `--repo ${shellQuote(repo)}`,
    `--state ${shellQuote(f.state ?? "open")}`,
    `--limit ${f.limit ?? 1000}`,
    `--json ${DETAIL_FIELDS}`
  ];
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
function ghPRMerge(repo, number, mode = "squash", deleteBranch = true) {
  const flags = [`--${mode}`];
  if (deleteBranch)
    flags.push("--delete-branch");
  _exec(`gh pr merge ${number} --repo ${shellQuote(repo)} ${flags.join(" ")}`, { stdio: "inherit" });
  const view = _exec(`gh pr view ${number} --repo ${shellQuote(repo)} --json mergeCommit,headRefName`).toString();
  const parsed = JSON.parse(view);
  return { mergedSha: parsed.mergeCommit?.oid ?? "", headBranch: parsed.headRefName ?? "" };
}
var PR_FIELDS = "number,title,body,headRefName,baseRefName,url,isDraft,reviewDecision,mergeable,labels,reviews,comments,statusCheckRollup,closingIssuesReferences,createdAt,updatedAt";
function ghPRListMine(repo, limit = 30) {
  const out = _exec(`gh pr list --repo ${shellQuote(repo)} --author @me --state open --limit ${limit} --json ${PR_FIELDS}`).toString();
  return JSON.parse(out);
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
  const out = _exec(`gh issue list --repo ${shellQuote(repo)} --state open --label ${shellQuote(label)} --limit ${limit} --json ${FIELDS},comments`).toString();
  return JSON.parse(out);
}
function ghOpenPRClosingIssues(repo) {
  const out = _exec(`gh pr list --repo ${shellQuote(repo)} --state open --limit 100 --json closingIssuesReferences`).toString();
  const prs = JSON.parse(out);
  return new Set(prs.flatMap((p) => (p.closingIssuesReferences ?? []).map((r) => r.number)));
}
function ghPRDiffText(repo, number) {
  return _exec(`gh pr diff ${number} --repo ${shellQuote(repo)}`, { maxBuffer: 32 * 1024 * 1024 }).toString();
}
function ghPRView(repo, number) {
  const out = _exec(`gh pr view ${number} --repo ${shellQuote(repo)} --json ${PR_FIELDS}`).toString();
  return JSON.parse(out);
}
var LABEL_COLORS = SHIPFLOW_CONTRACT.labels.colors;
var LABEL_PREFIX_COLORS = SHIPFLOW_CONTRACT.labels.prefixColors;
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
  _exec(`gh issue comment ${number} --repo ${shellQuote(repo)} --body ${shellQuote(body)}`, { stdio: "ignore" });
}
function ghLabelEverRemoved(repo, number, label) {
  try {
    const [owner, name] = repo.split("/");
    const path = `repos/${owner}/${name}/issues/${number}/timeline`;
    const out = _exec(`gh api ${shellQuote(path)} --paginate -q ${shellQuote('.[] | select(.event=="unlabeled") | .label.name')}`).toString();
    return out.split(`
`).map((s) => s.trim()).filter(Boolean).includes(label);
  } catch {
    return false;
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
  return nodes.map((c) => ({ id: String(c.id ?? ""), body: String(c.body ?? ""), viewerDidAuthor: !!c.viewerDidAuthor }));
}
function ghUpdateIssueComment(commentId, body) {
  const m = "mutation($id:ID!,$b:String!){updateIssueComment(input:{id:$id,body:$b}){issueComment{id}}}";
  _exec(`gh api graphql -f query=${shellQuote(m)} -f id=${shellQuote(commentId)} -f b=${shellQuote(body)}`, { stdio: "ignore" });
}
function ghCreateReview(repo, number, payload) {
  const [owner, name] = repo.split("/");
  _exec(`gh api repos/${shellQuote(owner)}/${shellQuote(name)}/pulls/${number}/reviews --method POST --input -`, { input: JSON.stringify(payload), stdio: ["pipe", "ignore", "pipe"] });
}
function ghReviewThreads(repo, number) {
  const [owner, name] = repo.split("/");
  const q = "query($o:String!,$r:String!,$n:Int!){repository(owner:$o,name:$r){pullRequest(number:$n){" + "reviewThreads(first:100){nodes{id isResolved comments(first:1){nodes{path line author{login} body}}}}}}}";
  const out = _exec(`gh api graphql -f query=${shellQuote(q)} -f o=${shellQuote(owner)} -f r=${shellQuote(name)} -F n=${number}`).toString();
  const nodes = JSON.parse(out)?.data?.repository?.pullRequest?.reviewThreads?.nodes ?? [];
  return nodes.map((t) => {
    const c = t.comments?.nodes?.[0] ?? {};
    return {
      id: String(t.id),
      isResolved: !!t.isResolved,
      path: c.path ?? "",
      line: c.line ?? null,
      author: c.author?.login ?? "",
      body: (c.body ?? "").slice(0, 240)
    };
  });
}
function ghResolveReviewThread(threadId) {
  const m = "mutation($t:ID!){resolveReviewThread(input:{threadId:$t}){thread{isResolved}}}";
  try {
    _exec(`gh api graphql -f query=${shellQuote(m)} -f t=${shellQuote(threadId)}`, { stdio: "ignore" });
  } catch {}
}

// src/commands/login.ts
function registerLoginCommand(program2) {
  program2.command("login").description("Sign in to ShipFlow (uses gh auth)").option("--no-gh-bootstrap", "Don't auto-run `gh auth login` if gh isn't logged in").action(async (opts) => {
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
    const result = await client.exchangeGhToken(ghToken);
    let chosen = result.tenants[0];
    if (result.tenants.length > 1) {
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
    console.log(`Signed in as @${process.env.USER ?? "you"} for ${chosen.tenant.displayName} (${apiUrl})${where}.${gitLine}`);
    if (!profile && result.tenants.length > 1) {
      console.log(`Tip: you belong to multiple tenants — keep them side by side with profiles, e.g.
` + `  renaiss-shipflow --profile ${chosen.tenant.githubOrg} login`);
    }
  });
}

// src/commands/git-identity.ts
import { execFileSync, execSync as execSync3 } from "node:child_process";
import { hostname } from "node:os";

// src/git-local.ts
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
var git = (args) => {
  try {
    return execSync3(`git ${args}`, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "";
  }
};
function registerGitIdentityCommand(program2) {
  program2.command("git-identity").description("Show (or --fix) the git identity used for commits — a machine-derived user.email gets deployments blocked as unmatched").option("--fix", "Set a REPO-LOCAL user.name/user.email from the GitHub account (login-captured, else live)").option("--email <email>", "Override the email used by --fix").option("--json", "Output JSON").action((opts) => {
    const effectiveEmail = git("config user.email");
    const effectiveName = git("config user.name");
    const host = hostname();
    const problem = suspiciousCommitEmail(effectiveEmail, host);
    if (!opts.fix) {
      if (opts.json) {
        console.log(JSON.stringify({ name: effectiveName || null, email: effectiveEmail || null, suspicious: problem }));
        return;
      }
      console.log(`user.name:  ${effectiveName || "(unset)"}`);
      console.log(`user.email: ${effectiveEmail || "(unset)"}`);
      if (problem) {
        console.log(`⚠️ ${problem} — forges can't match this to a GitHub account (deployments get blocked).`);
        console.log("Fix with: renaiss-shipflow git-identity --fix");
        process.exit(1);
      }
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
    if (opts.json) {
      console.log(JSON.stringify({ fixed: true, name, email }));
      return;
    }
    console.log(`Repo-local git identity set: ${name} <${email}>`);
  });
}

// src/commands/init.ts
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
function registerStatusCommand(program2) {
  program2.command("status").description("Show ShipFlow status for the current project").option("--json", "Output JSON").action(runAction(async (opts) => {
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

// src/commands/issues.ts
import { writeFileSync as writeFileSync2 } from "node:fs";
import { resolve as resolve3 } from "node:path";

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
var collect = (v, prev) => prev.concat([v]);
function registerIssuesCommand(program2) {
  const issues = program2.command("issues").description("Issue listing");
  issues.command("list").description("List open issues for the current repo, with ShipFlow triage overlay").option("--state <state>", "Issue state", "open").option("--limit <n>", "Max results", "30").option("--json", "Output JSON").action(runAction(async (opts) => {
    const { project } = await loadCtx(program2);
    const list = ghIssueList(project.repoFullName, opts.state, parseInt(opts.limit, 10));
    emit(opts, { project, issues: list }, () => {
      if (!list.length) {
        console.log("No issues.");
        return;
      }
      const rows = list.map((i) => [`#${i.number}`, i.title, i.labels.map((l) => l.name).join(", ")]);
      for (const l of renderTable(["#", "Title", "Labels"], rows))
        console.log(l);
    }, { pretty: true });
  }));
  issues.command("export").description("Export issue details to an Excel (.xlsx) file, with the filters GitHub issues support").option("--state <state>", "Issue state: open | closed | all", "open").option("--label <label>", "Filter by label (repeatable)", collect, []).option("--assignee <login>", "Filter by assignee").option("--author <login>", "Filter by author").option("--mention <login>", "Filter by mentioned user").option("--milestone <name>", "Filter by milestone name or number").option("--search <query>", 'GitHub search syntax (e.g. "error in:title sort:created-asc")').option("--limit <n>", "Max issues to export", "1000").option("--out <file>", "Output path (default: shipflow-issues-<repo>-<date>.xlsx)").action(runAction(async (opts) => {
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
import { hostname as hostname2 } from "node:os";
import { readFileSync as readFileSync2 } from "node:fs";
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

// src/issue-order.ts
var NEEDS_HUMAN_LABEL = SHIPFLOW_CONTRACT.labels.names.needsHuman;
var IN_PROGRESS_LABEL = SHIPFLOW_CONTRACT.labels.names.inProgress;
var WAITING_ON_LABEL = SHIPFLOW_CONTRACT.labels.names.waitingOn;
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
  if (filter.label && !labels.includes(filter.label))
    return false;
  if (filter.assignee && !issue.assignees.some((a) => a.login === filter.assignee))
    return false;
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
    const m = comments[i].body.match(/<!--\s*shipflow:waiting-on\s+([\w.-]+\/[\w.-]+)#(\d+)\s*-->/);
    if (m)
      return { repo: m[1], number: parseInt(m[2], 10) };
  }
  return null;
}
function isStaleInProgress(issue, claimed, openPRIssues) {
  if (!issue.labels.some((l) => l.name === IN_PROGRESS_LABEL))
    return false;
  return !claimed.has(issue.number) && !openPRIssues.has(issue.number);
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

// src/evidence.ts
var IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"];
function isImagePath(p) {
  const lower = p.toLowerCase();
  return IMAGE_EXTS.some((e) => lower.endsWith(e));
}
function validateEvidenceSelection(before, after, misc, labels = [], beforeCaptions = [], afterCaptions = [], imageCaptions = []) {
  const hasBefore = before.length > 0;
  const hasAfter = after.length > 0;
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
  if (imageCaptions.length > misc.length) {
    return `${imageCaptions.length} --image-caption(s) for ${misc.length} supplementary file(s) — captions describe files by position, at most one per --image/--file.`;
  }
  if (!hasBefore && !hasAfter) {
    if (misc.some(isImagePath)) {
      return "Screenshot evidence must show the fix — pass --before <img> and --after <img>. (--file is only for video or extra media.)";
    }
    if (misc.length === 0) {
      return "Nothing to attach. Provide --before and --after screenshots (and optionally --file for a screen recording).";
    }
  }
  return null;
}

// src/commands/issue.ts
function registerIssueCommand(program2) {
  const issue = program2.command("issue").description("Issue actions");
  issue.command("create").description("Open a new issue (and signal ShipFlow)").option("--repo <fullname>", "Override target repo").option("--title <title>", "Issue title").option("--body <body>", "Issue body (- for stdin)").option("--label <name...>", "Label(s) to apply (created if missing) — e.g. bug auto-qa").option("--json", "Output JSON").action(runAction(async (opts) => {
    const ctx = await loadCtx(program2);
    const repo = opts.repo ?? ctx.project.repoFullName;
    const title = opts.title ?? await promptText("Title: ");
    const body = opts.body === "-" ? await readStdin() : opts.body ?? "";
    for (const p of lintMessageBody(body))
      console.warn(`⚠️  body lint: ${p}`);
    const labels = opts.label ?? [];
    for (const l of labels)
      ghEnsureLabel(repo, l);
    const created = ghIssueCreate(repo, title, body, labels);
    emit(opts, { number: created.number, url: created.url, labels }, () => console.log(created.url));
  }));
  issue.command("work <number>").description("Exclusively claim an issue (lock + dump context); exits 3 when another agent holds it").option("--repo <fullname>", "Override target repo").option("--agent <name>", "Agent label recorded on the claim (default: $SHIPFLOW_AGENT or hostname)").option("--ttl <minutes>", "Claim lifetime in minutes (default 120)").option("--json", "Output JSON").action(runAction(async (numberStr, opts) => {
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
    const triage = await ctx.client.getTriage(ctx.creds.org, ctx.project.projectId, repo, number).catch(() => null);
    printIssueContext(issueData, triage, repo, ctx.project, opts.json);
  }));
  issue.command("next").description("Pick & claim the next open, unclaimed issue (for the work loop); exits 4 when none remain").option("--repo <fullname>", "Override target repo").option("--label <label>", "Only consider issues with this label").option("--assignee <login>", "Only consider issues assigned to this user").option("--agent <name>", "Agent label recorded on the claim (default: $SHIPFLOW_AGENT or hostname)").option("--ttl <minutes>", "Claim lifetime in minutes (default 120)").option("--json", "Output JSON").action(runAction(async (opts) => {
    const ctx = await loadCtx(program2);
    const repo = opts.repo ?? ctx.project.repoFullName;
    const agent = opts.agent ?? process.env.SHIPFLOW_AGENT ?? hostname2();
    const open = ghIssueList(repo, "open", 200);
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
        ghIssueComment(repo, i.number, `✅ Dependency ${dep.repo}#${dep.number} closed — re-admitted to the loop queue.`);
        console.warn(`⏳ #${i.number}: dependency ${dep.repo}#${dep.number} closed — cleared "${WAITING_ON_LABEL}", competing this tick.`);
      } catch (e) {
        console.warn(`waiting-on heal failed for #${i.number} (still waiting): ${e.message}`);
      }
    }
    const matching = open.filter((i) => isActionableForPickup(i, { claimed: claimed.has(i.number), label: opts.label, assignee: opts.assignee }));
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
      const triage = await ctx.client.getTriage(ctx.creds.org, ctx.project.projectId, repo, cand.number).catch(() => null);
      printIssueContext(issueData, triage, repo, ctx.project, opts.json);
      return;
    }
    const reason = raced === candidates.length && raced > 0 ? "all_candidates_raced" : "no_actionable_issues";
    emit(opts, { issue: null, reason }, () => console.log(reason === "all_candidates_raced" ? `⏳ All ${raced} candidate(s) were claimed by other agents this tick — retry next tick.` : "✅ No actionable issues — every open issue is claimed or filtered out."), { pretty: true });
    process.exit(4);
  }));
  issue.command("done <number>").description("Release an issue (signal only)").option("--reason <reason>", "Why you're releasing it (e.g. blocked, finished)").option("--repo <fullname>", "Override target repo").option("--json", "Output JSON").action(runAction(async (numberStr, opts) => {
    const ctx = await loadCtx(program2);
    const { number, repo } = resolveTarget(ctx, numberStr, opts);
    const reason = opts.reason ?? "";
    await ctx.client.signal(ctx.creds.org, ctx.project.projectId, "issues", number, "release-claim", { repo, reason });
    emit(opts, { number, released: true, reason }, () => console.log(`Released #${number}.`));
  }));
  issue.command("escalate <number>").description("Hand an issue to a human: label needs-human + comment why. Keeps the work lock so the loop skips it this run.").option("--reason <reason>", "Why it's blocked / what a human must decide", "").option("--category <key>", `Why this class of work is gated on a human — appends the standard rationale. One of: ${Object.keys(ESCALATION_CATEGORIES).join(", ")}`).option("--owner <login>", "Accountable human named on the comment (default: signoff-owner config, else the issue author)").option("--update", "Edit the loop's latest \uD83D\uDEA7 escalation comment in place instead of stacking a new one").option("--force", "Skip the reason lint (open question without recommendation / not self-contained / no action section)").option("--repo <fullname>", "Override target repo").option("--keep-in-progress", "Keep the \uD83E\uDD16 in-progress label (default: swap it for needs-human)").option("--release", "Also release the ShipFlow claim (default: keep it so the loop won't re-pick it this run)").option("--json", "Output JSON").action(runAction(async (numberStr, opts) => {
    const reason = (opts.reason ?? "").trim();
    if (opts.category && !(opts.category in ESCALATION_CATEGORIES)) {
      console.error(`Unknown escalation category "${opts.category}" — valid: ${Object.keys(ESCALATION_CATEGORIES).join(", ")}`);
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
      body = formatEscalationBody(reason, { category: opts.category, owner });
    } catch (e) {
      console.error(e.message);
      process.exit(1);
    }
    let precedent;
    if (opts.category && !opts.update) {
      try {
        precedent = await ctx.client.matchPrecedent(ctx.creds.org, ctx.project.projectId, {
          category: opts.category,
          reason,
          repo,
          issue: number
        });
      } catch {
        precedent = undefined;
      }
    }
    if (precedent?.outcome === "apply" && precedent.precedent) {
      ghIssueComment(repo, number, formatPrecedentDisclosure(precedent));
      emit(opts, {
        number,
        escalated: false,
        autoResolved: true,
        reason,
        category: opts.category ?? null,
        precedent: { outcome: precedent.outcome, answer: precedent.precedent.answer, sourceIssue: precedent.precedent.sourceIssue }
      }, () => console.log(`\uD83D\uDD01 #${number} auto-resolved from your #${precedent.precedent.sourceIssue} decision — disclosure posted, reply \`undo\` to reverse.`));
      return;
    }
    const surfaced = precedent && (precedent.outcome === "suggest" || precedent.outcome === "reconfirm") && precedent.precedent;
    if (surfaced)
      body = `${body}

${formatPrecedentSuggestion(precedent)}`;
    ghEnsureLabel(repo, NEEDS_HUMAN_LABEL, "d93f0b", "ShipFlow loop needs a human to decide");
    ghIssueAddLabels(repo, number, [NEEDS_HUMAN_LABEL]);
    if (!opts.keepInProgress)
      ghIssueRemoveLabel(repo, number, IN_PROGRESS_LABEL);
    let updated = false;
    if (opts.update) {
      const existing = findLatestEscalationComment(ghIssueComments(repo, number));
      if (existing) {
        ghUpdateIssueComment(existing.id, body);
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
      precedent: surfaced ? { outcome: precedent.outcome, sourceIssue: precedent.precedent.sourceIssue, answer: precedent.precedent.answer } : null
    }, () => console.log(`\uD83D\uDEA7 #${number} escalated${updated ? " (existing \uD83D\uDEA7 comment updated)" : ""} → labelled "${NEEDS_HUMAN_LABEL}"${owner ? `, owner @${owner}` : ""}${surfaced ? ", precedent on file surfaced" : ""}${released ? " and claim released" : " (claim kept — loop skips it this run)"}.`));
  }));
  issue.command("wait <number>").description("Park an issue on a dependency: label ⏳ waiting-on + comment. Unlike escalate, no human is needed — issue next skips it while the dependency is open and re-admits it automatically when the dependency merges/closes.").option("--on <ref>", "The blocking issue/PR: #123, 123, owner/repo#123, or a GitHub issue/PR URL").option("--reason <reason>", "One line on why this waits", "").option("--repo <fullname>", "Override target repo").option("--keep-in-progress", "Keep the \uD83E\uDD16 in-progress label (default: swap it for ⏳ waiting-on)").option("--json", "Output JSON").action(runAction(async (numberStr, opts) => {
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
  issue.command("evidence <number>").description("Attach testing evidence. Screenshots must show the fix: --before AND --after pairs, one per changed surface, named with --label (reporter thread + a PR comment, or the issue if no --pr)").option("--before <path...>", "Screenshot(s) BEFORE the fix — before[i] pairs with after[i]").option("--after <path...>", "Screenshot(s) AFTER the fix — one per --before").option("--label <text...>", 'Name for each pair, by position (e.g. --label "Mode row" "Grade ladder") — a multi-surface change attaches one labeled pair per surface').option("--before-caption <text...>", "Caption for each --before shot, by position — describes what THAT shot shows (keeps a summary from over-claiming)").option("--after-caption <text...>", "Caption for each --after shot, by position").option("--image-caption <text...>", "Caption for each supplementary --image/--file, by position").option("--touched <name...>", "Touched feature names — the evidence gallery renders a red gap card for each one without a matching proof pair").option("--image <path...>", "Extra screenshot file(s) — prefer --before/--after").option("--file <path...>", "Supplementary media — a screen recording (mp4/mov/webm) or extra files").option("--pr <n>", "Related PR number — when set, the evidence comment lands on the PR instead of the issue").option("--preview-url <url>", "Testing site URL").option("--caption <text>", "Short note shown with the evidence").option("--repo <fullname>", "Override target repo").option("--json", "Output JSON").action(runAction(async (numberStr, opts) => {
    const before = opts.before ?? [];
    const after = opts.after ?? [];
    const labels = opts.label ?? [];
    const beforeCaptions = opts.beforeCaption ?? [];
    const afterCaptions = opts.afterCaption ?? [];
    const imageCaptions = opts.imageCaption ?? [];
    const misc = [...opts.file ?? [], ...opts.image ?? []];
    const selErr = validateEvidenceSelection(before, after, misc, labels, beforeCaptions, afterCaptions, imageCaptions);
    if (selErr) {
      console.error(selErr);
      process.exit(1);
    }
    const ctx = await loadCtx(program2);
    const { number, repo } = resolveTarget(ctx, numberStr, opts);
    const toImg = (p) => ({ filename: basename2(p), data: new Uint8Array(readFileSync2(p)) });
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
      images: misc.map(toImg)
    });
    emit(opts, res, () => {
      const where = [];
      if (res.threadNotified)
        where.push("reporter thread");
      if (res.prCommented)
        where.push("PR comment");
      if (res.githubCommented)
        where.push("GitHub issue comment");
      console.log(`\uD83E\uDDEA Evidence delivered to: ${where.join(" + ") || "nowhere (check server logs)"}`);
      for (const u of res.threadImageUrls ?? [])
        console.log(`  ${u}`);
    }, { pretty: true });
  }));
}
function printIssueContext(issueData, triage, repo, project, json) {
  if (json) {
    console.log(JSON.stringify({ issue: issueData, triage, project }, null, 2));
    return;
  }
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
  }
}
async function readStdin() {
  const chunks = [];
  for await (const c of process.stdin)
    chunks.push(c);
  return Buffer.concat(chunks).toString("utf-8");
}

// src/pr-state.ts
var FAILING = new Set(["FAILURE", "TIMED_OUT", "CANCELLED", "ACTION_REQUIRED", "ERROR", "STARTUP_FAILURE"]);
var PENDING = new Set(["PENDING", "EXPECTED", "QUEUED", "IN_PROGRESS", "WAITING", "REQUESTED"]);
var APPROVAL_LABELS = new Set([SHIPFLOW_CONTRACT.labels.names.shipflowApproved, "approved", "✅ approved"]);
function ciStateOf(checks) {
  if (!checks || checks.length === 0)
    return "none";
  let failing = false;
  let pending = false;
  let passing = false;
  for (const c of checks) {
    const concl = (c.conclusion ?? "").toUpperCase();
    const status = (c.status ?? "").toUpperCase();
    const state = (c.state ?? "").toUpperCase();
    if (FAILING.has(concl) || FAILING.has(state)) {
      failing = true;
    } else if (status && status !== "COMPLETED" || PENDING.has(state)) {
      pending = true;
    } else if (concl === "SUCCESS" || concl === "NEUTRAL" || concl === "SKIPPED" || state === "SUCCESS") {
      passing = true;
    }
  }
  if (failing)
    return "failing";
  if (pending)
    return "pending";
  if (passing)
    return "passing";
  return "none";
}
function prAttentionReasons(pr, me) {
  const reasons = [];
  if (pr.reviewDecision === "CHANGES_REQUESTED")
    reasons.push("changes_requested");
  const failing = (pr.statusCheckRollup ?? []).some((c) => FAILING.has((c.conclusion ?? "").toUpperCase()) || FAILING.has((c.state ?? "").toUpperCase()));
  if (failing)
    reasons.push("ci_failing");
  const fromOthers = (a) => !!a.author && a.author.login !== me;
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
  return last.author && last.author.login !== me ? last : null;
}
function isApproved(pr) {
  if (pr.reviewDecision === "APPROVED")
    return true;
  return (pr.labels ?? []).some((l) => APPROVAL_LABELS.has(l.name.trim().toLowerCase()));
}
function hoursSince(iso, nowMs = Date.now()) {
  if (!iso)
    return 0;
  const t = Date.parse(iso);
  if (Number.isNaN(t))
    return 0;
  return Math.max(0, (nowMs - t) / 3600000);
}
function classifyPR(pr, me, opts = {}) {
  let reasons = prAttentionReasons(pr, me);
  if (opts.unresolvedThreads === 0) {
    reasons = reasons.filter((r) => r !== "review_comments");
  }
  const ciState = ciStateOf(pr.statusCheckRollup);
  const approved = isApproved(pr);
  const ageHours = hoursSince(pr.updatedAt, opts.nowMs);
  const staleHours = opts.staleHours ?? 48;
  let state;
  if (ciState === "failing")
    state = "ci_failing";
  else if (pr.reviewDecision === "CHANGES_REQUESTED")
    state = "changes_requested";
  else if (reasons.includes("review_comments"))
    state = "review_comments";
  else if (ciState === "pending")
    state = "ci_pending";
  else if (approved)
    state = "approved_ready";
  else if (ageHours >= staleHours)
    state = "stale";
  else
    state = "awaiting_review";
  const needsAction = state !== "ci_pending" && state !== "awaiting_review";
  return { number: pr.number, state, ciState, approved, ageHours, reasons, needsAction };
}
var INTENT_BLOCKER = "unconfirmed interpretation — needs reporter confirmation";
function intentGate(i) {
  const blocked = i.hasLabel || i.signal && !i.everCleared;
  const applyLabel = i.signal && !i.hasLabel && !i.everCleared;
  return { blocked, applyLabel };
}
var NO_CI_GRACE_HOURS = 0.25;
function mergeDecision(pr, me, opts) {
  const cl = classifyPR(pr, me, { staleHours: opts.staleHours, nowMs: opts.nowMs });
  const blockers = [];
  if (opts.policy === "manual")
    blockers.push("merge-policy is manual (human merge required)");
  if (cl.ciState === "failing")
    blockers.push("CI is failing");
  if (cl.ciState === "pending")
    blockers.push("CI still running");
  let unsatisfiable = false;
  if (opts.requireCi && cl.ciState === "none") {
    const zeroCheckAgeH = hoursSince(pr.createdAt, opts.nowMs);
    const noCiComing = pr.createdAt != null && zeroCheckAgeH >= NO_CI_GRACE_HOURS;
    if (opts.policy !== "manual" && noCiComing) {
      unsatisfiable = true;
      blockers.push("require-ci is on but no CI has reported and none is coming — add a workflow that runs on PRs, or run: renaiss-shipflow config set require-ci false");
    } else {
      blockers.push("no CI checks to confirm (set require-ci=false to allow)");
    }
  }
  if (pr.reviewDecision === "CHANGES_REQUESTED")
    blockers.push("changes requested");
  if ((opts.unresolvedThreads ?? 0) > 0)
    blockers.push(`${opts.unresolvedThreads} unresolved review thread(s) — address + resolve them first`);
  if ((pr.mergeable ?? "").toUpperCase() === "CONFLICTING")
    blockers.push("merge conflict with base (run: pr sync)");
  if (opts.policy === "auto-on-green" && !cl.approved) {
    blockers.push("not approved (needs a GitHub review approval or a shipflow-approved label)");
  }
  if (opts.policy === "auto-timeout" && !cl.approved && cl.ageHours < opts.staleHours) {
    blockers.push(`awaiting approval or the ${opts.staleHours}h timeout (age ${Math.round(cl.ageHours)}h)`);
  }
  if (opts.intentBlocked)
    blockers.push(INTENT_BLOCKER);
  return { policy: opts.policy, wouldMerge: blockers.length === 0, blockers, ...unsatisfiable ? { unsatisfiable: true } : {} };
}

// src/commands/inbox.ts
function safeUnresolvedThreadCount(fetchThreads) {
  try {
    return { count: fetchThreads().filter((t) => !t.isResolved).length, degraded: false };
  } catch {
    return { count: 0, degraded: true };
  }
}
function registerInboxCommand(program2) {
  program2.command("inbox").description("Reconciler view: open PRs (by state: ci_failing / changes_requested / approved_ready / stale …) and in-progress issues with new comments").option("--repo <fullname>", "Override target repo").option("--json", "Output JSON").action(runAction(async (opts) => {
    const { project } = await loadCtx(program2);
    const repo = opts.repo ?? project.repoFullName;
    const me = ghCurrentLogin();
    const staleHours = resolveStalePrHours();
    const prs = ghPRListMine(repo).map((pr) => {
      const { count: unresolvedThreads, degraded: degraded2 } = safeUnresolvedThreadCount(() => ghReviewThreads(repo, pr.number));
      const cl = classifyPR(pr, me, { staleHours, unresolvedThreads });
      return {
        number: pr.number,
        title: pr.title,
        branch: pr.headRefName,
        base: pr.baseRefName ?? "",
        url: pr.url,
        draft: pr.isDraft,
        reviewDecision: pr.reviewDecision || "none",
        unresolvedThreads,
        closesIssues: (pr.closingIssuesReferences ?? []).map((i) => i.number),
        state: cl.state,
        ciState: cl.ciState,
        approved: cl.approved,
        ageHours: Math.round(cl.ageHours),
        needsAttention: cl.needsAction,
        reasons: cl.reasons,
        ...degraded2 ? { degraded: true } : {}
      };
    });
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
    const degraded = prs.filter((p) => ("degraded" in p) && p.degraded).length;
    const summary = {
      prsNeedingAttention: prs.filter((p) => p.needsAttention).length,
      issuesNeedingAttention: issues.filter((i) => i.needsAttention).length,
      readyToMerge: count("approved_ready"),
      ciFailing: count("ci_failing"),
      changesRequested: count("changes_requested"),
      stale: count("stale"),
      parked: prs.filter((p) => p.state === "awaiting_review" || p.state === "ci_pending").length,
      degraded
    };
    emit(opts, { repo, prs, issues, summary }, () => {
      console.log(`\uD83D\uDCE5 Inbox for ${repo}`);
      console.log(`Needs action: ${meter(summary.prsNeedingAttention, prs.length)} PRs · ${meter(summary.issuesNeedingAttention, issues.length)} issues · ✅ ${summary.readyToMerge} ready to merge`);
      if (degraded)
        console.log(`⚠️  ${degraded} PR(s) with partial review-thread data (fetch blipped) — marked "degraded".`);
      const icon = {
        ci_failing: "\uD83D\uDD34",
        changes_requested: "✏️",
        review_comments: "\uD83D\uDCAC",
        ci_pending: "⏳",
        approved_ready: "✅",
        stale: "\uD83D\uDD70️",
        awaiting_review: "·"
      };
      if (prs.length) {
        console.log("");
        const rows = prs.map((p) => [
          `${icon[p.state] ?? "·"} #${p.number}`,
          p.state,
          `ci:${p.ciState}`,
          `${p.ageHours}h`,
          p.title + ("degraded" in p && p.degraded ? " ⚠️ degraded" : "")
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

// src/commands/features.ts
function registerFeaturesCommand(program2) {
  program2.command("features").description("ShipFlow's feature map for this project (features → file paths/test info) — the reviewer's whole-system view").option("--json", "Output the raw feature map").option("--category <name>", "Filter to one category").action(runAction(async (opts) => {
    const { creds, client, project } = await loadCtx(program2);
    const fm = await client.getFeatureMapping(creds.org, project.projectId);
    const features = fm.features ?? {};
    const keys = Object.keys(features).filter((k) => !opts.category || (features[k].category ?? "") === opts.category);
    const jsonOut = opts.category ? { ...fm, features: Object.fromEntries(keys.map((k) => [k, features[k]])) } : fm;
    emit(opts, jsonOut, () => {
      if (!keys.length) {
        console.log("No feature map for this project yet. Generate it from the ShipFlow dashboard.");
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
    }, { pretty: true });
  }));
}

// src/priorities.ts
import { existsSync as existsSync2, readFileSync as readFileSync3 } from "node:fs";
import { join as join2 } from "node:path";
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
  const path = join2(root, PRIORITIES_DOC_RELPATH);
  if (!existsSync2(path))
    return { found: false, path, classes: [] };
  const classes = parseWorkClasses(readFileSync3(path, "utf8"));
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
  program2.command("priorities").description(`Standing priorities doc (${PRIORITIES_DOC_RELPATH}) consulted at loop intake — greenlit work classes + WIP share (human-edited only)`).option("--json", "Output the parsed doc as JSON").action(runAction(async (opts) => {
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
var MERGE_POLICIES2 = ["manual", "auto-on-green", "auto-timeout"];
var SETTINGS = [
  {
    key: "auto-issue",
    field: "autoIssue",
    set: (v, c) => String(c.autoIssue = parseBool(v)),
    effective: resolveAutoIssue
  },
  {
    key: "live-reload",
    field: "liveReload",
    set: (v, c) => String(c.liveReload = parseBool(v)),
    effective: resolveLiveReload
  },
  {
    key: "require-ci",
    field: "requireCi",
    set: (v, c) => String(c.requireCi = parseBool(v)),
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
    set: (v, c) => String(c.maxFixAttempts = parseIntOr(v, 3)),
    effective: resolveMaxFixAttempts
  },
  {
    key: "wip-limit",
    field: "wipLimit",
    set: (v, c) => String(c.wipLimit = parseIntOr(v, 10)),
    effective: resolveWipLimit
  },
  {
    key: "stale-pr-hours",
    field: "stalePrHours",
    set: (v, c) => String(c.stalePrHours = parseIntOr(v, 48)),
    effective: resolveStalePrHours
  },
  {
    key: "bug-hunt",
    field: "bugHunt",
    set: (v, c) => String(c.bugHunt = parseBool(v)),
    effective: resolveBugHunt
  },
  {
    key: "bug-hunt-cap",
    field: "bugHuntCap",
    set: (v, c) => String(c.bugHuntCap = parseIntOr(v, 5)),
    effective: resolveBugHuntCap
  },
  {
    key: "require-review",
    field: "requireReview",
    set: (v, c) => String(c.requireReview = parseBool(v)),
    effective: resolveRequireReview
  },
  {
    key: "signoff-owner",
    field: "signoffOwner",
    set: (v, c) => c.signoffOwner = v.trim().replace(/^@/, ""),
    effective: resolveSignoffOwner
  },
  {
    key: "loop-worker-model",
    field: "loopWorkerModel",
    set: (v, c) => c.loopWorkerModel = v.trim(),
    effective: resolveLoopWorkerModel
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
  config.command("set <key> <value>").description(`Set a preference. Keys: ${KEYS.join(", ")}`).option("--json", "Output JSON").action((key, value, opts) => {
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
    if (opts.json) {
      console.log(JSON.stringify({ [s.field]: s.effective() ?? null }));
      return;
    }
    console.log(`${key} = ${echo}`);
  });
  config.command("get <key>").description("Read a preference (env vars override stored config)").option("--json", "Output JSON").action((key, opts) => {
    const s = byKey.get(key) ?? unknownKey(key, opts.json);
    const v = s.effective();
    if (opts.json) {
      console.log(JSON.stringify({ [s.field]: v ?? null }));
      return;
    }
    console.log(v === undefined ? "unset" : String(v));
  });
  config.command("list").description("Show all preferences (effective values)").option("--json", "Output JSON").action((opts) => {
    if (opts.json) {
      const obj = {};
      for (const s of SETTINGS)
        obj[s.field] = s.effective() ?? null;
      console.log(JSON.stringify(obj, null, 2));
      return;
    }
    const rows = SETTINGS.map((s) => {
      const v = s.effective();
      return [s.key, v === undefined ? "unset" : String(v)];
    });
    for (const l of renderTable(["Key", "Value"], rows))
      console.log(l);
  });
}

// src/commands/claims.ts
function registerClaimsCommand(program2) {
  program2.command("claims").description("List active agent claims (who is working on what)").option("--json", "Output JSON").action(runAction(async (opts) => {
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
var CAPABILITY_CLASSES = ["capability", "access", "secret", "policy"];
var CAPABILITY_STATUSES = ["open", "granted", "declined"];
function registerCapabilityCommand(program2) {
  const capability = program2.command("capability").description("Standing queue for capabilities/access/secrets/policy the agent can't grant itself");
  capability.command("request").description("File a capability request into the standing queue").requiredOption("--class <class>", `One of: ${CAPABILITY_CLASSES.join(" | ")}`).requiredOption("--title <title>", "Short summary of the ask").requiredOption("--why <why>", "Why the agent needs it (the blocker it unblocks)").option("--issue <number>", "Escalating issue number this ask came from").option("--repo <fullname>", "Repo the ask is scoped to (default: the active project's)").option("--json", "Output JSON").action(runAction(async (opts) => {
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
  capability.command("list").description("List capability requests in the standing queue (newest first)").option("--status <status>", `Filter by status: ${CAPABILITY_STATUSES.join(" | ")}`).option("--json", "Output JSON").action(runAction(async (opts) => {
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

// src/commands/pr.ts
import { execSync as execSync4 } from "node:child_process";
import { readFileSync as readFileSync4 } from "node:fs";
import { hostname as hostname3 } from "node:os";

// src/review-contract-data.ts
var REVIEW_CONTRACT = {
  $comment: "Canonical review contract (epic #96, Option B): the single source of truth for constants BOTH reviewers share — the Go server's pr_review runner and the TS CLI's loop review packet. Mirrors: apps/renaissshipflow-server/internal/reviewcontract/review-contract.json (go:embed, byte-identical) and apps/renaissshipflow-cli/src/review-contract-data.ts (generated). Regenerate mirrors with `node scripts/sync-review-contract.mjs`; parity tests on both sides fail on drift. Noise lists are the UNION of the two pre-contract lists (never narrow), split into scopes: the lists under `noise` are shared review-filter noise; `noise.featuremapOnly` is feature-map-only (tracked, reviewable source the loop packet must keep showing). Verdict vocabularies are carried per side AS-IS — reconciliation is a later slice. `ownsTestVectors` pins the directory-boundary `owns` matcher, which stays implemented per language.",
  version: 1,
  budgets: {
    $comment: "perFileDiffCap/packetTotalCap bound each reviewer's diff; briefCap bounds the linked-issue spec + PR body (acceptance criteria sit at the BOTTOM of issue bodies — a tight cap silently drops the checklist).",
    perFileDiffCap: 24000,
    packetTotalCap: 150000,
    briefCap: 8000
  },
  noise: {
    $comment: "Paths excluded from review diffs / the feature map, in two scopes. The lists directly under `noise` are SHARED review-filter noise: excluded from both reviewers' diffs and from the feature map. `featuremapOnly` entries are excluded from the feature map only — and, transitively, from the Go server's review filter, which shares featuremap.IsNoisePath (its pre-contract behavior) — but they are tracked, reviewable source the loop packet MUST keep showing (pre-contract it was the only reviewer that saw them). Matching: substrings contains-match anywhere in the path (TS case-insensitively, Go case-sensitively — each side keeps its pre-contract semantics). suffixes: trailing patterns filepath.Ext can't express. basenames: exact filenames (matched against the path's base name, never as a suffix). extensions: final-dot file extensions.",
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
  ]
};

// src/packet.ts
var PACKET_PER_FILE_CAP = REVIEW_CONTRACT.budgets.perFileDiffCap;
var PACKET_TOTAL_CAP = REVIEW_CONTRACT.budgets.packetTotalCap;
var PACKET_BRIEF_CAP = REVIEW_CONTRACT.budgets.briefCap;
var NOISE_SUBSTRINGS = REVIEW_CONTRACT.noise.substrings.map((s) => s.toLowerCase());
var NOISE_SUFFIXES = [
  ...REVIEW_CONTRACT.noise.suffixes,
  ...REVIEW_CONTRACT.noise.extensions
].map((s) => s.toLowerCase());
var NOISE_BASENAMES = REVIEW_CONTRACT.noise.basenames.map((s) => s.toLowerCase());
function isNoiseDiffPath(path) {
  const p = path.replace(/\\/g, "/").replace(/^\.\//, "").toLowerCase();
  const base = p.slice(p.lastIndexOf("/") + 1);
  return NOISE_BASENAMES.includes(base) || NOISE_SUBSTRINGS.some((s) => p.includes(s)) || NOISE_SUFFIXES.some((s) => p.endsWith(s));
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
function summarizeChecks(checks) {
  let passing = 0, failing = 0, pending = 0;
  const failingChecks = [];
  for (const c of checks) {
    const concl = (c.conclusion ?? c.state ?? "").toUpperCase();
    if (concl === "SUCCESS" || concl === "NEUTRAL" || concl === "SKIPPED")
      passing++;
    else if (concl === "" || concl === "PENDING" || (c.status ?? "").toUpperCase() === "IN_PROGRESS")
      pending++;
    else {
      failing++;
      failingChecks.push(c.name ?? "unnamed");
    }
  }
  return { passing, failing, pending, failingChecks, reported: checks.length > 0 };
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
function ownsPath(prefix, path) {
  const p = prefix.replace(/^\.\//, "");
  if (!p)
    return false;
  return path === p || path.startsWith(p.endsWith("/") ? p : p + "/");
}
function touchedFeatures(diffPaths, features) {
  const changed = diffPaths.filter((p) => !isNoiseDiffPath(p));
  const out = [];
  for (const f of features) {
    if ((f.paths ?? []).some((prefix) => changed.some((path) => ownsPath(prefix, path)))) {
      out.push(f.name || f.key);
    }
  }
  return out;
}
function assessEvidenceCoverage(touched, comments) {
  const evidenceItems = comments.filter((c) => {
    const body = c.body ?? "";
    return /^\s*🧪.*Test evidence/m.test(body) || /^\s*-?\s*\*{0,2}verified:/im.test(body);
  }).length;
  if (touched.length <= 1 || evidenceItems >= touched.length) {
    return { evidenceItems, warning: null };
  }
  return {
    evidenceItems,
    warning: `⚠️ ${touched.length} features touched, ${evidenceItems} evidence item(s) — ` + `need ≥1 proof per feature on a multi-feature PR; treat each unproven feature ` + `as an unresolved thread (request_changes) unless every touched feature maps ` + `to a proof.`
  };
}
function extractDeviations(prBody) {
  const m = /^###\s*Deviations from brief\s*$/im.exec(prBody);
  if (!m)
    return "";
  const rest = prBody.slice(m.index + m[0].length);
  const end = rest.search(/^#{1,3}\s/m);
  return (end >= 0 ? rest.slice(0, end) : rest).trim();
}
var INTERPRETATION_NOTE_CALLOUT = /^[^\p{L}\n]*interpretation note/imu;
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
  b.push(`
## CI`);
  const ci = summarizeChecks(pr.statusCheckRollup ?? []);
  if (!ci.reported) {
    b.push("no checks reported");
  } else {
    b.push(`${ci.passing} passing · ${ci.failing} failing · ${ci.pending} pending${ci.failingChecks.length ? ` — failing: ${ci.failingChecks.join(", ")}` : ""}`);
  }
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
  const evidence = extractEvidenceLines(pr.comments ?? []);
  b.push(`
## Evidence / health`);
  if (input.features?.length) {
    const touched = touchedFeatures(splitUnifiedDiff(diff).map((s) => s.path), input.features);
    if (touched.length) {
      b.push(`Features touched (${touched.length}): ${touched.join(", ")}`);
      const cov = assessEvidenceCoverage(touched, pr.comments ?? []);
      if (cov.warning)
        b.push(cov.warning);
    }
  }
  b.push(evidence.length ? evidence.join(`
`) : "no evidence caption posted");
  if (input.features?.length) {
    const diffPaths = splitUnifiedDiff(diff).map((s) => s.path);
    const touchedNames = new Set(touchedFeatures(diffPaths, input.features));
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
  const reviewThreads = {
    unresolved: unresolved.length,
    items: unresolved.slice(0, 20).map((t) => ({
      path: t.path || null,
      line: t.line ?? null,
      author: t.author || "unknown",
      body: t.body.replace(/\s+/g, " ").slice(0, 140)
    }))
  };
  const evidence = { lines: extractEvidenceLines(pr.comments ?? []) };
  let features;
  if (input.features?.length) {
    const diffPaths = splitUnifiedDiff(diff).map((s) => s.path);
    const touchedNames = touchedFeatures(diffPaths, input.features);
    if (touchedNames.length) {
      evidence.featuresTouched = touchedNames;
      evidence.coverageWarning = assessEvidenceCoverage(touchedNames, pr.comments ?? []).warning;
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
var REVIEW_MARKER = "<!-- shipflow:loop-review -->";
function renderFindingBody(f) {
  let b = `${severityBadge(f.severity)}${effortTag(f.effort)} ${f.issue}`;
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
  return p.replace(/\\/g, "/").replace(/^\.\//, "").trim();
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
      const anchor = f.line > 0 ? `${f.path}:${f.line}` : f.path;
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
    comments: inline.map((f) => ({ path: f.path, line: f.line, side: "RIGHT", body: renderFindingBody(f) }))
  };
}

// src/commands/pr.ts
var APPROVED_LABEL = SHIPFLOW_CONTRACT.labels.names.shipflowApproved;
var REPORTER_REVIEW_LABEL = SHIPFLOW_CONTRACT.labels.names.needsReporterReview;
function evalIntentGate(repo, number, prView) {
  const hasLabel = (prView.labels ?? []).some((l) => l.name === REPORTER_REVIEW_LABEL);
  const signal = hasInterpretationSignal(prView.body ?? "");
  const everCleared = signal && !hasLabel ? ghLabelEverRemoved(repo, number, REPORTER_REVIEW_LABEL) : false;
  return intentGate({ signal, hasLabel, everCleared });
}
function unresolvedThreadsOrBlock(repo, number) {
  try {
    return { count: ghReviewThreads(repo, number).filter((t) => !t.isResolved).length, unavailable: false };
  } catch {
    return { count: 0, unavailable: true };
  }
}
function registerPRCommand(program2) {
  const pr = program2.command("pr").description("Pull request actions");
  pr.command("create").description("Open a PR; prepends ShipFlow context to the body and signals ShipFlow").option("--issue <n>", "Issue number this PR closes (auto-detected from branch if omitted)").option("--title <title>", "PR title").option("--body <body>", "PR body (added under ShipFlow header)").option("--base <ref>", "Base branch").option("--draft", "Create as draft").option("--preview-url <url>", "Testing/preview site for this PR (relayed to the issue reporter)").option("--allow-suspicious-email", "Skip the commit-email identity guard (not recommended)").option("--lint <mode>", "Prose lint on --body (issue #196): warn (print problems, proceed) or strict (exit 2, no PR)", "warn").option("--json", "Output JSON").action(runAction(async (opts) => {
    const ctx = await loadCtx(program2);
    const branch = currentBranch();
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
    const lintProblems = lintMessageBody(opts.body ?? "");
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
    const issueNumber = opts.issue ? parseInt(opts.issue, 10) : detectIssueFromBranch(branch);
    const issueUrl = issueNumber ? `https://github.com/${ctx.project.repoFullName}/issues/${issueNumber}` : undefined;
    const header = buildShipFlowHeader(ctx.project.projectName, issueNumber, issueUrl);
    const body = `${header}

${opts.body ?? ""}`;
    const created = ghPRCreate({ repo: ctx.project.repoFullName, body, title: opts.title, base: opts.base, head: branch, draft: opts.draft });
    await signalBestEffort(ctx, "prs", created.number, "opened", {
      repo: ctx.project.repoFullName,
      branch,
      headSha: execSync4("git rev-parse HEAD").toString().trim(),
      issueRefs: issueNumber ? [issueNumber] : [],
      previewUrl: opts.previewUrl ?? ""
    }, "PR opened but ShipFlow signal failed");
    emit(opts, created, () => console.log(created.url));
  }));
  pr.command("merge <number>").description("Merge a PR; signals ShipFlow (no downstream cascade)").option("--mode <mode>", "squash | merge | rebase", "squash").option("--keep-branch", "Don't delete the head branch").option("--json", "Output JSON").action(runAction(async (numberStr, opts) => {
    const ctx = await loadCtx(program2);
    const { number, repo } = resolveTarget(ctx, numberStr, opts);
    const result = ghPRMerge(repo, number, opts.mode, !opts.keepBranch);
    if (!opts.keepBranch)
      cleanupMergedLocalBranch(result.headBranch);
    const signalOk = await signalBestEffort(ctx, "prs", number, "merged", {
      repo,
      mergedSha: result.mergedSha
    }, "Merged but ShipFlow signal failed");
    emit(opts, { number, merged: true, mergedSha: result.mergedSha, mode: opts.mode, signalOk }, () => console.log(`merged: ${result.mergedSha}`));
  }));
  pr.command("ready <number>").description("Report whether a PR is mergeable under the active merge policy (read-only — used by the loop)").option("--policy <p>", "Override merge policy: manual | auto-on-green | auto-timeout").option("--repo <fullname>", "Override target repo").option("--json", "Output JSON").action(runAction(async (numberStr, opts) => {
    const ctx = await loadCtx(program2);
    const { number, repo } = resolveTarget(ctx, numberStr, opts);
    const policy = opts.policy ?? resolveMergePolicy();
    const staleHours = resolveStalePrHours();
    const me = ghCurrentLogin();
    const prView = ghPRView(repo, number);
    const cl = classifyPR(prView, me, { staleHours });
    const threads = unresolvedThreadsOrBlock(repo, number);
    const unresolvedThreads = threads.count;
    const gate = evalIntentGate(repo, number, prView);
    const decision = mergeDecision(prView, me, { policy, requireCi: resolveRequireCi(), staleHours, unresolvedThreads, intentBlocked: gate.blocked });
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
      blockers
    };
    emit(opts, out, () => {
      console.log(`PR #${number}: ${wouldMerge ? "✅ READY TO MERGE" : "⏸️  NOT READY"} · ${cl.state} · ci=${cl.ciState} · approved=${cl.approved} · policy=${policy}`);
      for (const b of blockers)
        console.log(`  [ ] ${b}`);
    }, { pretty: true });
  }));
  pr.command("automerge <number>").description("Merge a PR only if policy + CI + approval allow it; otherwise no-op and exit 5. The loop's safe auto-merge.").option("--policy <p>", "Override merge policy: manual | auto-on-green | auto-timeout").option("--mode <mode>", "squash | merge | rebase", "squash").option("--repo <fullname>", "Override target repo").option("--json", "Output JSON").action(runAction(async (numberStr, opts) => {
    const ctx = await loadCtx(program2);
    const { number, repo } = resolveTarget(ctx, numberStr, opts);
    const policy = opts.policy ?? resolveMergePolicy();
    const staleHours = resolveStalePrHours();
    const me = ghCurrentLogin();
    const prView = ghPRView(repo, number);
    const threads = unresolvedThreadsOrBlock(repo, number);
    const unresolvedThreads = threads.count;
    const gate = evalIntentGate(repo, number, prView);
    const decision = mergeDecision(prView, me, { policy, requireCi: resolveRequireCi(), staleHours, unresolvedThreads, intentBlocked: gate.blocked });
    const blockers = threads.unavailable ? ["review threads unavailable", ...decision.blockers] : decision.blockers;
    const wouldMerge = decision.wouldMerge && !threads.unavailable;
    if (!wouldMerge) {
      if (gate.applyLabel) {
        try {
          ghEnsureLabel(repo, REPORTER_REVIEW_LABEL, labelColorFor(REPORTER_REVIEW_LABEL), "An unconfirmed worker interpretation/deviation awaiting the issue reporter's confirmation");
          ghIssueAddLabels(repo, number, [REPORTER_REVIEW_LABEL]);
        } catch (e) {
          console.warn(`needs-reporter-review label failed (will retry next attempt): ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      emit(opts, { number, merged: false, policy, blockers, ...decision.unsatisfiable ? { unsatisfiable: true } : {} }, () => {
        console.log(`⏸️  PR #${number} not auto-merged — still blocked on:`);
        for (const b of blockers)
          console.log(`  [ ] ${b}`);
        if (decision.unsatisfiable) {
          console.log("  ⚠️  This blocker cannot clear by waiting — escalate for a human decision.");
        }
      });
      process.exit(5);
    }
    const result = ghPRMerge(repo, number, opts.mode ?? "squash", true);
    cleanupMergedLocalBranch(result.headBranch);
    await signalBestEffort(ctx, "prs", number, "merged", { repo, mergedSha: result.mergedSha }, "Merged but ShipFlow signal failed");
    const closed = (prView.closingIssuesReferences ?? []).map((i) => i.number);
    for (const n of closed) {
      await signalBestEffort(ctx, "issues", n, "release-claim", { repo, reason: `merged via PR #${number}` });
    }
    emit(opts, { number, merged: true, mergedSha: result.mergedSha, policy, closedIssues: closed }, () => console.log(`✅ Merged PR #${number} (${result.mergedSha}) under policy=${policy}${closed.length ? ` — closes #${closed.join(", #")}` : ""}.`));
  }));
  pr.command("sync <number>").description("Rebase the PR's branch onto its (moved) base; aborts cleanly on conflict so the loop can escalate. Run on the PR's checked-out branch.").option("--repo <fullname>", "Override target repo").option("--no-push", "Don't force-with-lease push after a clean rebase").option("--json", "Output JSON").action(runAction(async (numberStr, opts) => {
    const ctx = await loadCtx(program2);
    const { number, repo } = resolveTarget(ctx, numberStr, opts);
    const prView = ghPRView(repo, number);
    const base = prView.baseRefName;
    const head = prView.headRefName;
    if (!base) {
      console.error(`PR #${number} has no base branch.`);
      process.exit(1);
    }
    const cur = execSync4("git rev-parse --abbrev-ref HEAD").toString().trim();
    if (cur !== head) {
      console.error(`On branch "${cur}" but PR #${number} is "${head}". Check it out first: git checkout ${head}`);
      process.exit(1);
    }
    try {
      execSync4(`git fetch origin ${shellQuote(base)}`, { stdio: "ignore" });
    } catch (e) {
      throw new Error(`git fetch origin ${base} failed (network or remote issue): ${e.message}`);
    }
    let conflicted = false;
    try {
      execSync4(`git rebase ${shellQuote(`origin/${base}`)}`, { stdio: "pipe" });
    } catch {
      try {
        execSync4("git rebase --abort", { stdio: "ignore" });
      } catch {}
      conflicted = true;
    }
    if (conflicted) {
      emit(opts, { number, rebased: false, conflict: true, base }, () => console.log(`\uD83D\uDD00 PR #${number}: rebase onto ${base} conflicts — aborted. Resolve manually or escalate.`));
      process.exit(6);
    }
    let pushed = false;
    if (opts.push !== false) {
      try {
        execSync4("git push --force-with-lease", { stdio: "ignore" });
      } catch (e) {
        throw new Error(`git push --force-with-lease failed (network, or the remote moved — rebase again): ${e.message}`);
      }
      pushed = true;
    }
    emit(opts, { number, rebased: true, conflict: false, base, pushed }, () => console.log(`\uD83D\uDD00 PR #${number}: rebased "${head}" onto ${base}${pushed ? " and pushed" : ""}.`));
  }));
  pr.command("packet <number>").description("Emit the pre-baked review packet for a PR: spec/brief, description, CI, unresolved threads, evidence, and a noise-filtered budgeted diff — everything the loop reviewer needs in one call").option("--repo <fullname>", "Override target repo").option("--json", "Emit the packet as a structured object instead of markdown").action(runAction(async (numberStr, opts) => {
    const ctx = await loadCtx(program2);
    const { number, repo } = resolveTarget(ctx, numberStr, opts);
    const prView = ghPRView(repo, number);
    let threads = [];
    try {
      threads = ghReviewThreads(repo, number);
    } catch {}
    const diff = ghPRDiffText(repo, number);
    let issue = null;
    const closing = prView.closingIssuesReferences?.[0];
    const partOf = /Part of #(\d+)/i.exec(prView.body ?? "");
    const linkedNum = closing?.number ?? (partOf ? parseInt(partOf[1], 10) : 0);
    if (linkedNum > 0) {
      try {
        issue = { ...ghIssueView(repo, linkedNum), linkKind: closing ? "closes" : "part-of" };
      } catch {}
    }
    let features;
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
    } catch {}
    if (opts.json) {
      console.log(JSON.stringify(buildReviewPacketData({ pr: prView, threads, diff, issue, features }), null, 2));
      return;
    }
    console.log(buildReviewPacket({ pr: prView, threads, diff, issue, features }));
  }));
  pr.command("post-review <number>").description("Post the loop reviewer's findings as a formal review with INLINE diff-anchored comments (like the server) — findings sit on the code diff, not a diff-less top-level comment").option("--summary <text>", "1-2 sentence verdict summary").option("--verdict <v>", "approve | comment | request_changes | reject", "comment").option("--findings <path>", "JSON file of findings (array or {findings:[...]}); '-' or omitted reads stdin").option("--repo <fullname>", "Override target repo").option("--json", "Output JSON").action(runAction(async (numberStr, opts) => {
    const ctx = await loadCtx(program2);
    const { number, repo } = resolveTarget(ctx, numberStr, opts);
    const rawFindings = opts.findings && opts.findings !== "-" ? readFileSync4(opts.findings, "utf8") : opts.findings === "-" ? await readStdin2() : "";
    let parsed;
    try {
      parsed = JSON.parse(rawFindings || "[]");
    } catch {
      console.error("--findings must be valid JSON (an array, or {findings:[...]})");
      process.exit(1);
    }
    const findings = Array.isArray(parsed) ? parsed : parsed?.findings ?? [];
    const verdict = ["approve", "comment", "request_changes", "reject"].includes(opts.verdict ?? "") ? opts.verdict : "comment";
    const anchors = diffAnchors(ghPRDiffText(repo, number));
    const payload = buildReviewPayload({ summary: opts.summary ?? "", verdict, findings, anchors });
    ghCreateReview(repo, number, payload);
    const inlineCount = payload.comments.length;
    const foldedCount = findings.length - inlineCount;
    emit(opts, { number, verdict, inline: inlineCount, folded: foldedCount }, () => console.log(`Posted ${verdict} review on #${number}: ${inlineCount} inline finding(s) on the diff${foldedCount ? `, ${foldedCount} folded into the body` : ""}.`));
  }));
  pr.command("approve <number>").description("Record the loop reviewer's approval: adds the shipflow-approved label (the automerge approval source) + an optional comment").option("--comment <text>", "Reviewer summary to post on the PR").option("--repo <fullname>", "Override target repo").option("--force", "Approve even with unresolved review threads (not recommended)").option("--json", "Output JSON").action(runAction(async (numberStr, opts) => {
    const ctx = await loadCtx(program2);
    const { number, repo } = resolveTarget(ctx, numberStr, opts);
    const unresolved = ghReviewThreads(repo, number).filter((t) => !t.isResolved);
    if (unresolved.length && !opts.force) {
      const rows = unresolved.map((t) => [t.author ?? "?", `${t.path}:${t.line ?? "?"}`, t.body.split(`
`)[0].slice(0, 80)]);
      const list = renderTable(["Reviewer", "Location", "Comment"], rows).map((l) => `  ${l}`).join(`
`);
      emit(opts, { number, approved: false, unresolvedThreads: unresolved.length }, () => console.error(`⛔ Not approving PR #${number}: ${unresolved.length} unresolved review thread(s):
${list}
Address + resolve them (pr resolve), then approve (or --force).`));
      process.exit(7);
    }
    ghEnsureLabel(repo, APPROVED_LABEL, labelColorFor(APPROVED_LABEL), "Reviewed and approved by the ShipFlow loop reviewer");
    ghIssueAddLabels(repo, number, [APPROVED_LABEL]);
    ghIssueRemoveLabel(repo, number, NEEDS_HUMAN_LABEL);
    if (opts.comment) {
      execSync4(`gh pr comment ${number} --repo ${shellQuote(repo)} --body ${shellQuote(opts.comment)}`, { stdio: "ignore" });
    }
    emit(opts, { number, approved: true, label: APPROVED_LABEL }, () => console.log(`✅ PR #${number} approved — labelled "${APPROVED_LABEL}" (automerge can proceed under an auto-* policy).`));
  }));
  pr.command("reviews <number>").description("External review state: unresolved review threads (incl. bot reviewers) the loop must fix before approving").option("--repo <fullname>", "Override target repo").option("--json", "Output JSON").action(runAction(async (numberStr, opts) => {
    const ctx = await loadCtx(program2);
    const { number, repo } = resolveTarget(ctx, numberStr, opts);
    const me = ghCurrentLogin();
    const threads = ghReviewThreads(repo, number);
    const unresolved = threads.filter((t) => !t.isResolved);
    const externalUnresolved = unresolved.filter((t) => t.author && t.author !== me);
    const out = {
      number,
      blocking: externalUnresolved.length > 0,
      unresolvedThreads: unresolved.length,
      externalUnresolved: externalUnresolved.length,
      reviewers: [...new Set(threads.map((t) => t.author).filter(Boolean))],
      threads: unresolved.map((t) => ({ id: t.id, author: t.author, path: t.path, line: t.line, body: t.body }))
    };
    emit(opts, out, () => {
      if (!unresolved.length) {
        console.log(`✅ PR #${number}: no unresolved review threads.`);
        return;
      }
      console.log(`PR #${number}: ${unresolved.length} unresolved thread(s)${out.blocking ? " — BLOCKS approval/merge" : ""}`);
      const rows = unresolved.map((t) => [t.author ?? "?", `${t.path}:${t.line ?? "?"}`, t.body.split(`
`)[0].slice(0, 90)]);
      for (const l of renderTable(["Reviewer", "Location", "Comment"], rows))
        console.log(`  ${l}`);
    }, { pretty: true });
  }));
  pr.command("resolve <number>").description("Resolve review threads the loop has addressed (all unresolved, or specific --thread ids)").option("--thread <id...>", "Specific thread node-id(s) to resolve (default: all unresolved)").option("--repo <fullname>", "Override target repo").option("--json", "Output JSON").action(runAction(async (numberStr, opts) => {
    const ctx = await loadCtx(program2);
    const { number, repo } = resolveTarget(ctx, numberStr, opts);
    const unresolved = ghReviewThreads(repo, number).filter((t) => !t.isResolved);
    const targets = opts.thread?.length ? unresolved.filter((t) => opts.thread.includes(t.id)) : unresolved;
    for (const t of targets)
      ghResolveReviewThread(t.id);
    emit(opts, { number, resolved: targets.length }, () => console.log(`\uD83E\uDDF5 Resolved ${targets.length} review thread(s) on PR #${number}.`));
  }));
}
function branchAuthorEmails() {
  for (const range of ["origin/main..HEAD", "origin/master..HEAD"]) {
    try {
      const out = execSync4(`git log --format=%ae ${range}`, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
      if (out)
        return out.split(`
`);
      return [];
    } catch {}
  }
  try {
    return execSync4("git log --format=%ae -30", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim().split(`
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
function currentBranch() {
  return execSync4("git rev-parse --abbrev-ref HEAD").toString().trim();
}
function detectIssueFromBranch(branch) {
  const m = branch.match(/^(?:issue|fix|feat)\/(\d+)/);
  return m ? parseInt(m[1], 10) : undefined;
}
function buildShipFlowHeader(project, issueNumber, issueUrl) {
  const lines = ["## ShipFlow context", `- Project: ${project}`];
  if (issueNumber)
    lines.push(issueUrl ? `- Closes #${issueNumber} — ${issueUrl}` : `- Closes #${issueNumber}`);
  return lines.join(`
`);
}

// src/commands/test.ts
import { existsSync as existsSync3, readFileSync as readFileSync5 } from "node:fs";
import { join as join3 } from "node:path";
function registerTestCommand(program2) {
  program2.command("test").description("Run the project's local test command (auto-detected)").option("--json", "Emit a machine-readable summary line (runner + exit code); test output still streams").allowUnknownOption().action((opts) => {
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
    if (!opts.json)
      console.log(`> ${command}`);
    const code = runRunner(runner, root);
    if (opts.json) {
      console.log(JSON.stringify({ runner: command, source: runner.source, exitCode: code, passed: code === 0 }));
    }
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
    const pkg = JSON.parse(readFileSync5(join3(root, "package.json"), "utf8"));
    return typeof pkg?.scripts?.test === "string" && pkg.scripts.test.trim() !== "";
  } catch {
    return false;
  }
}
function detectRunner(root) {
  if (existsSync3(join3(root, "package.json"))) {
    const bunArgs = hasTestScript(root) ? ["run", "test"] : ["test"];
    if (existsSync3(join3(root, "bun.lockb")))
      return { cmd: "bun", args: bunArgs, source: "bun.lockb" };
    if (existsSync3(join3(root, "bun.lock")))
      return { cmd: "bun", args: bunArgs, source: "bun.lock" };
    if (existsSync3(join3(root, "pnpm-lock.yaml")))
      return { cmd: "pnpm", args: ["test"], source: "pnpm-lock.yaml" };
    if (existsSync3(join3(root, "yarn.lock")))
      return { cmd: "yarn", args: ["test"], source: "yarn.lock" };
    return { cmd: "npm", args: ["test"], source: "package.json" };
  }
  if (existsSync3(join3(root, "go.mod")))
    return { cmd: "go", args: ["test", "./..."], source: "go.mod" };
  if (existsSync3(join3(root, "Cargo.toml")))
    return { cmd: "cargo", args: ["test"], source: "Cargo.toml" };
  if (existsSync3(join3(root, "pyproject.toml")))
    return { cmd: "pytest", args: [], source: "pyproject.toml" };
  if (existsSync3(join3(root, "pytest.ini")))
    return { cmd: "pytest", args: [], source: "pytest.ini" };
  return null;
}

// src/commands/regression.ts
import { execSync as execSync5 } from "node:child_process";
var REF_RESOLUTION_ERROR = "Failed to resolve git HEAD ref. Ensure you are in a git repository with at least one commit, or pass --ref explicitly.";
function resolveRef(explicit, runGit = () => execSync5("git rev-parse HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim()) {
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
  const regression = program2.command("regression").description("Trigger ShipFlow's server-side regression test_runner. Exercises the project's " + "configured test environment (per-branch testing needs preview deploys — a separate server change).").option("--ref <sha>", "Ref to test (defaults to current HEAD)").option("--preview-url <url>", "Preview-deploy URL to run against (must match the environment previewUrlPatterns allowlist)").option("--wait", "Poll until the run finishes; exit non-zero on failure or timeout").option("--timeout <sec>", "Max seconds to wait with --wait", "600").option("--json", "Output JSON").action(runAction(async (opts) => {
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
    if (!opts.json)
      console.log(`Regression run queued: ${execId} — waiting up to ${timeoutSec}s...`);
    const code = await waitAndReport(client, creds.org, execId, {
      json: opts.json,
      timeoutMs: timeoutSec * 1000,
      intervalMs: 5000
    });
    process.exit(code);
  }));
  regression.command("status <executionId>").description("Fetch and print the result of a prior regression run (non-zero exit on failure)").option("--json", "Output JSON").action(runAction(async (executionId, opts) => {
    const { creds, client } = loadJwtCtx(program2);
    const code = await fetchAndReport(client, creds.org, executionId, { json: opts.json });
    process.exit(code);
  }));
}

// src/commands/release.ts
import { execSync as execSync6 } from "node:child_process";
function registerReleaseCommand(program2) {
  program2.command("release").description("Trigger a ShipFlow release (patch_notes + regression + downstream workflows)").option("--tag <tag>", "Release tag (e.g. v0.7.3)").option("--base-tag <tag>", "Previous tag (auto-detect if omitted)").option("--env <env>", "Target environment (staging|prod)").option("--wait", "Block and stream status until terminal").option("--json", "Output JSON").action(runAction(async (opts) => {
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
    return execSync6("git describe --tags --abbrev=0", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return;
  }
}

// src/commands/profile.ts
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
  const profiles = program2.command("profiles").description("List config profiles (isolated credentials per tenant)").option("--json", "Output JSON").action((opts) => {
    const active = activeProfile();
    const data = rows();
    if (opts.json) {
      console.log(JSON.stringify({ active: active || null, dir: configDir(), profiles: data }, null, 2));
      return;
    }
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
  });
  profiles.command("dir").description("Print the active config directory (honors --profile / SHIPFLOW_PROFILE / SHIPFLOW_CONFIG_DIR)").action(() => {
    console.log(configDir());
  });
}

// src/index.ts
var pkg = createRequire2(import.meta.url)("../package.json");
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
registerIssuesCommand(program2);
registerIssueCommand(program2);
registerInboxCommand(program2);
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
