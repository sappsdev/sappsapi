export class TrieNode {
  children: Map<string, TrieNode>;
  isEnd: boolean;

  constructor() {
    this.children = new Map();
    this.isEnd = false;
  }
}

export class Trie {
  private root: TrieNode;

  constructor() {
    this.root = new TrieNode();
  }

  insert(path: string): void {
    const segments = path.split("/").filter(Boolean);
    let node = this.root;

    for (const segment of segments) {
      if (!node.children.has(segment)) {
        node.children.set(segment, new TrieNode());
      }
      node = node.children.get(segment)!;
    }
    node.isEnd = true;
  }

  match(path: string): string | null {
    const segments = path.split("/").filter(Boolean);
    const matchedPath = this._matchRecursive(this.root, segments, []);

    return matchedPath ? `/${matchedPath.join("/")}` : null;
  }

  private _matchRecursive(
    node: TrieNode,
    segments: string[],
    pathAcc: string[]
  ): string[] | null {
    if (segments.length === 0) {
      return node.isEnd ? pathAcc : null;
    }

    const [current, ...rest] = segments;

    if (node.children.has(current)) {
      const exactPath = this._matchRecursive(
        node.children.get(current)!,
        rest,
        [...pathAcc, current]
      );
      if (exactPath) return exactPath;
    }

    for (const [key, childNode] of node.children) {
      if (key.startsWith(":")) {
        const dynamicPath = this._matchRecursive(childNode, rest, [
          ...pathAcc,
          key,
        ]);
        if (dynamicPath) return dynamicPath;
      }
    }

    return null;
  }
}
