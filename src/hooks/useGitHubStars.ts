import { useQuery } from "@tanstack/react-query";

interface GitHubRepoData {
	stargazers_count: number;
}

export function useGitHubStars(repo: string = "orchable/orchable") {
	return useQuery({
		queryKey: ["github-stars", repo],
		queryFn: async (): Promise<number> => {
			const response = await fetch(
				`https://api.github.com/repos/${repo}`,
			);
			if (!response.ok) {
				throw new Error("Failed to fetch GitHub stars");
			}
			const data: GitHubRepoData = await response.json();
			return data.stargazers_count;
		},
		staleTime: 1000 * 60 * 60, // 1 hour
		retry: 2,
	});
}
