import { Extractor } from '../extractor';
import { Config } from '../types';

export const getDefaultConfig = (): Config => {
  return { multi: 'on', en: 'on' };
};

export const showErrors = (config: Config): boolean => 'showErrors' in config;

export const showExternalUrls = (config: Config): boolean => 'includeExternalUrls' in config;

export const hasMultiEnabled = (config: Config): boolean => 'multi' in config;

export const disableExtractorConfigKey = (extractor: Extractor): string => `disableExtractor_${extractor.id}`;

export const isExtractorDisabled = (config: Config, extractor: Extractor): boolean => disableExtractorConfigKey(extractor) in config;

export const excludeResolutionConfigKey = (resolution: string): string => `excludeResolution_${resolution}`;

export const isResolutionExcluded = (config: Config, resolution: string): boolean => excludeResolutionConfigKey(resolution) in config;

export const parseConfig = (configStr: string | undefined): Config => {
    if (!configStr) return getDefaultConfig();
    try {
        const decoded = decodeURIComponent(configStr);
        return JSON.parse(decoded);
    } catch (e) {
        try {
            return JSON.parse(configStr);
        } catch (e2) {
            console.error('Failed to parse config:', configStr, e, e2);
            return getDefaultConfig();
        }
    }
};
