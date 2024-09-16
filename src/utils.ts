import { SurePlugin } from './sure-plugin';
import { AllOfPlugins, OneOfPlugins, SurePluginConstructor } from './type';

export function assert(condition: any, msg?: string): asserts condition {
  if (!condition) {
    throw new Error(msg);
  }
}

export const enum MatchMethodType {
  AllOf,
  OneOf,
}

export function allOf(Plugins: AllOfPlugins['Plugins']): AllOfPlugins {
  return {
    type: MatchMethodType.AllOf,
    Plugins,
  };
}

export function oneIf(
  mustMatch: OneOfPlugins['mustMatch'],
  Plugins: OneOfPlugins['Plugins']
): OneOfPlugins {
  return {
    type: MatchMethodType.OneOf,
    mustMatch,
    Plugins,
  };
}

export function oneOf(Plugins: OneOfPlugins['Plugins']) {
  return oneIf([], Plugins);
}

export function matchPlugins(sp: SurePlugin, Plugins: SurePluginConstructor[]) {
  for (const Plugin of Plugins) {
    if (!sp.useValue(Plugin).success) {
      return { success: false };
    }
  }
  return { success: true };
}
