/**
 * Multi-Provider LLM Configuration
 * 
 * Supports: OpenAI, Anthropic, Google (Gemini), Groq
 * 
 * Set LLM_PROVIDER in .env to switch between providers:
 * - openai (default)
 * - anthropic
 * - google
 * - groq
 */

import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { groq } from '@ai-sdk/groq';
import { LanguageModel } from 'ai';

export type LLMProvider = 'openai' | 'anthropic' | 'google' | 'groq';

interface ProviderConfig {
    provider: LLMProvider;
    model: string;
    description: string;
}

// Get the current provider configuration from environment
export function getProviderConfig(): ProviderConfig {
    const provider = (process.env.LLM_PROVIDER || 'openai') as LLMProvider;

    switch (provider) {
        case 'anthropic':
            return {
                provider: 'anthropic',
                model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
                description: 'Anthropic Claude 3.5 Sonnet',
            };
        case 'google':
            return {
                provider: 'google',
                model: process.env.GOOGLE_MODEL || 'gemini-1.5-pro',
                description: 'Google Gemini 1.5 Pro',
            };
        case 'groq':
            return {
                provider: 'groq',
                model: process.env.GROQ_MODEL || 'llama-3.1-70b-versatile',
                description: 'Groq Llama 3.1 70B',
            };
        case 'openai':
        default:
            return {
                provider: 'openai',
                model: process.env.OPENAI_MODEL || 'gpt-4o',
                description: 'OpenAI GPT-4o',
            };
    }
}

// Get the model instance for Vercel AI SDK
export function getModel(): LanguageModel {
    const config = getProviderConfig();

    switch (config.provider) {
        case 'anthropic':
            return anthropic(config.model);
        case 'google':
            return google(config.model);
        case 'groq':
            return groq(config.model);
        case 'openai':
        default:
            return openai(config.model);
    }
}

// Export provider information for display
export function getProviderInfo(): { name: string; model: string } {
    const config = getProviderConfig();
    return {
        name: config.description,
        model: config.model,
    };
}
