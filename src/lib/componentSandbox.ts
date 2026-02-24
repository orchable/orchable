import { transform } from "sucrase";
import React from "react";
import * as LucideIcons from "lucide-react";
import * as ShadcUI from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
	CardFooter,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Static analysis blocklist for security
const FORBIDDEN_PATTERNS = [
	/\bwindow\b/i,
	/\bdocument\b/i,
	/\bfetch\b/i,
	/\blocalStorage\b/i,
	/\bsessionStorage\b/i,
	/\bXMLHttpRequest\b/i,
	/\bWebSocket\b/i,
	/\beval\b/i,
	/\bFunction\b/i,
	/\bimport\b/i,
	/\brequire\b/i,
	/\bglobalThis\b/i,
	/\bself\b/i,
	/\b__proto__\b/i,
	/\bconstructor\b\./i,
	/\bprototype\b/i,
	/\bpostMessage\b/i,
	/\bsetTimeout\b/i,
	/\bsetInterval\b/i,
	/dangerouslySetInnerHTML/i,
];

export interface ValidationResult {
	valid: boolean;
	errors: string[];
}

/**
 * Validates TSX source code against forbidden patterns.
 */
export function validateSource(code: string): ValidationResult {
	const errors: string[] = [];

	for (const pattern of FORBIDDEN_PATTERNS) {
		if (pattern.test(code)) {
			errors.push(`Forbidden pattern detected: ${pattern.toString()}`);
		}
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}

/**
 * Compiles TSX source code to plain JavaScript using Sucrase.
 */
export function compileComponent(tsxSource: string): string {
	try {
		const result = transform(tsxSource, {
			transforms: ["typescript", "jsx"],
			jsxRuntime: "classic", // Use classic to avoid complex imports in scoped function
		});
		return result.code;
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		throw new Error(`Compilation failed: ${message}`);
	}
}

/**
 * Injected scope for custom components.
 */
const getSharedScope = () => ({
	React,
	useState: React.useState,
	useEffect: React.useEffect,
	useMemo: React.useMemo,
	useCallback: React.useCallback,
	cn,
	Badge,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
	CardFooter,
	...LucideIcons,
	...ShadcUI,
});

/**
 * Creates a React component from compiled JS code within a scoped environment.
 */
export function createScopedComponent(
	compiledJs: string,
	componentProps: Record<string, unknown>,
): React.FC<Record<string, unknown>> {
	try {
		const scope = getSharedScope();
		const keys = Object.keys(scope);
		// Filter out 'Component', 'React', and other common hooks to avoid re-declaration conflicts
		// Be more aggressive in filtering to prevent accidental re-declaration of common identifiers
		const filteredKeys = keys.filter(
			(k) =>
				![
					"Component",
					"React",
					"useState",
					"useEffect",
					"useMemo",
					"useCallback",
					"cn",
					"Badge",
					"Card",
					"CardContent",
					"CardHeader",
					"CardTitle",
					"CardDescription",
					"CardFooter",
				].includes(k),
		);

		const functionBody = `
      const { React, useState, useEffect, useMemo, useCallback, cn, Badge, Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter, ${filteredKeys.join(", ")} } = scope;
      ${compiledJs}
      // Return the component. We assume it's defined as 'Component' or exported.
      return typeof Component !== 'undefined' ? Component : null;
    `;

		const factory = new Function("scope", functionBody);
		const Component = factory(scope);

		if (typeof Component !== "function") {
			throw new Error(
				'No valid "Component" function found in the source code.',
			);
		}

		return Component;
	} catch (err: unknown) {
		console.error("Failed to create scoped component:", err);
		throw err;
	}
}
