import { describe, expect, test } from 'claude-code/testing'

import { commandBlock, commandSegments, commitArgs, spawnBlock, subjectOf } from '../hooks/guards'

const HEREDOC_COMMIT = `git commit -m "$(cat <<'EOF'
[AI] add retry to order sync

Retries twice with backoff (no jitter yet).
EOF
)"`

describe('commandSegments', () => {
  test('splits on control operators and keeps quoted text whole', () => {
    expect(commandSegments('git add . && git commit -m "one; two" | cat')).toEqual([
      ['git', 'add', '.'],
      ['git', 'commit', '-m', 'one; two'],
      ['cat'],
    ])
  })

  test('keeps a command substitution with a heredoc as one word', () => {
    const segments = commandSegments(HEREDOC_COMMIT)
    expect(segments).toHaveLength(1)
    expect(segments[0]?.slice(0, 3)).toEqual(['git', 'commit', '-m'])
  })

  test('drops comments and top-level heredoc bodies', () => {
    expect(commandSegments('echo hi # git push -f')).toEqual([['echo', 'hi']])
    expect(commandSegments('git commit -F - <<EOF\ngit push --force\nEOF\necho done')).toEqual([
      ['git', 'commit', '-F', '-'],
      ['echo', 'done'],
    ])
  })
})

describe('commit messages', () => {
  test('reads -m, --message, --message= and a short cluster', () => {
    expect(commitArgs(['-m', 'a']).messages).toEqual(['a'])
    expect(commitArgs(['--message', 'b']).messages).toEqual(['b'])
    expect(commitArgs(['--message=c']).messages).toEqual(['c'])
    expect(commitArgs(['-am', 'd']).messages).toEqual(['d'])
    expect(commitArgs(['-me']).messages).toEqual(['e'])
  })

  test('marks a message from a file or another commit as uncheckable', () => {
    expect(commitArgs(['-F', 'msg.txt']).isUncheckable).toBe(true)
    expect(commitArgs(['--fixup=abc123']).isUncheckable).toBe(true)
    expect(commitArgs(['-C', 'HEAD']).isUncheckable).toBe(true)
  })

  test('takes the heredoc subject and refuses to guess a variable', () => {
    const message = commandSegments(HEREDOC_COMMIT)[0]?.[3] ?? ''
    expect(subjectOf(message)).toBe('[AI] add retry to order sync')
    expect(subjectOf('$MESSAGE')).toBeNull()
    expect(subjectOf('\n\n[AI] first line\nbody')).toBe('[AI] first line')
  })
})

describe('commandBlock', () => {
  test('passes a subject with [AI] within 50 characters, plain or inside a repo format', () => {
    expect(commandBlock('git commit -m "[AI] add retry to order sync"')).toBeNull()
    expect(commandBlock('git commit -m "fix: [AI] retry order sync"')).toBeNull()
    expect(commandBlock(HEREDOC_COMMIT)).toBeNull()
  })

  test('blocks a subject without [AI]', () => {
    const block = commandBlock('git add . && git commit -m "Added retry logic to the order sync job"')
    expect(block?.guard).toBe('commit-message')
    expect(block?.reason).toContain('Got 39 characters, no [AI].')
  })

  test('blocks a subject past 50 characters', () => {
    const block = commandBlock('git commit -am "[AI] add jitter to the retry backoff in the order sync job"')
    expect(block?.guard).toBe('commit-message')
    expect(block?.reason).toContain('Got 58 characters.')
  })

  test('leaves commits it cannot read alone', () => {
    expect(commandBlock('git commit --amend --no-edit')).toBeNull()
    expect(commandBlock('git commit -F msg.txt')).toBeNull()
    expect(commandBlock('git commit -m "$SUBJECT"')).toBeNull()
    expect(commandBlock('git log -m --oneline')).toBeNull()
  })

  test('blocks git commit -n and every force push form', () => {
    expect(commandBlock('git commit -nm "[AI] skip hooks"')?.guard).toBe('no-bypass')
    for (const push of ['git push -f origin feat', 'git push --force', 'git push --force-with-lease origin feat', 'git push -uf origin feat', 'git push origin +feat']) {
      expect(commandBlock(push)?.guard).toBe('no-bypass')
    }
    expect(commandBlock('git push -u origin feat')).toBeNull()
    expect(commandBlock('git -C ../repo push --force')?.guard).toBe('no-bypass')
  })

  test('reads a message glued to its flag and the long no-verify spelling', () => {
    expect(commandBlock('git commit -m"Added retry logic"')?.guard).toBe('commit-message')
    expect(commandBlock('git commit -nm"[AI] skip hooks"')?.guard).toBe('no-bypass')
    expect(commandBlock('git commit --no-verify -m "[AI] skip hooks"')?.guard).toBe('no-bypass')
    expect(commandBlock('git commit -m"[AI] glued but fine"')).toBeNull()
    expect(commandBlock('git commit -uno -m "[AI] fine"')).toBeNull()
    expect(commandBlock('git commit -Snkey -m "[AI] signed"')).toBeNull()
  })

  test('finds git inside a subshell, a brace group and behind a wrapper', () => {
    expect(commandBlock('(cd ../repo && git push --force)')?.guard).toBe('no-bypass')
    expect(commandBlock('{ git push -f; }')?.guard).toBe('no-bypass')
    expect(commandBlock('sudo git push -f')?.guard).toBe('no-bypass')
    expect(commandBlock('env GIT_TRACE=1 git push --force')?.guard).toBe('no-bypass')
  })

  test('keeps reading the line after a heredoc starts and skips only its body', () => {
    expect(commandBlock('cat <<EOF > notes.txt && git push --force origin feat\nhello\nEOF')?.guard).toBe('no-bypass')
    expect(commandBlock('cat <<EOF > notes.txt\ngit push --force\nEOF\necho done')).toBeNull()
    expect(commandBlock('cat <<EOF | git commit -n -F -\nmsg\nEOF')?.guard).toBe('no-bypass')
  })

  test('reads commands run through sh -c, bash -lc and eval', () => {
    expect(commandBlock("sh -c 'git push --force origin feat'")?.guard).toBe('no-bypass')
    expect(commandBlock('bash -lc "cd repo && git commit -n -m x"')?.guard).toBe('no-bypass')
    expect(commandBlock('eval git push -f')?.guard).toBe('no-bypass')
    expect(commandBlock("sh -c 'git status'")).toBeNull()
  })

  test("blocks git's short long-option prefixes and hook-skipping config", () => {
    expect(commandBlock('git commit --no-veri -m "[AI] x"')?.guard).toBe('no-bypass')
    expect(commandBlock('git push --forc origin feat')?.guard).toBe('no-bypass')
    expect(commandBlock('git push --force-w origin feat')?.guard).toBe('no-bypass')
    expect(commandBlock('git -c core.hooksPath=/dev/null commit -m "[AI] x"')?.guard).toBe('no-bypass')
    expect(commandBlock('git -c remote.origin.push=+refs/heads/*:refs/heads/* push')?.guard).toBe('no-bypass')
    expect(commandBlock("git -c alias.p='push --force' p")?.guard).toBe('no-bypass')
    expect(commandBlock('git -c user.name=me commit -m "[AI] fine"')).toBeNull()
  })

  test('reads command substitutions the shell runs and leaves quoted text alone', () => {
    expect(commandBlock('echo $(git push -f)')?.guard).toBe('no-bypass')
    expect(commandBlock('echo `git push -f`')?.guard).toBe('no-bypass')
    expect(commandBlock('echo "pushed: $(git push --force)"')?.guard).toBe('no-bypass')
    expect(commandBlock("git commit -m '[AI] explain `git push -f` risk'")).toBeNull()
    expect(commandBlock("echo '$(git push -f)'")).toBeNull()
  })

  test('a shift with no heredoc terminator hides nothing after it', () => {
    expect(commandBlock('echo $((1<<x)) && git push --force origin feat')?.guard).toBe('no-bypass')
  })

  test('catches hook and force settings written by git config or the environment', () => {
    expect(commandBlock('git config core.hooksPath /dev/null')?.guard).toBe('no-bypass')
    expect(commandBlock("git config alias.p 'push -f'")?.guard).toBe('no-bypass')
    expect(commandBlock("git config --local remote.origin.push '+refs/heads/*:refs/heads/*'")?.guard).toBe('no-bypass')
    expect(commandBlock('git --config-env=core.hooksPath=HOOKS commit -m "[AI] x"')?.guard).toBe('no-bypass')
    expect(commandBlock('GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.hooksPath GIT_CONFIG_VALUE_0=/dev/null git commit -m "[AI] x"')?.guard).toBe('no-bypass')
    expect(commandBlock("git -c alias.p='push -fu' p")?.guard).toBe('no-bypass')
    expect(commandBlock('git config user.name me')).toBeNull()
  })

  test('refuses a git write nested deeper than it reads', () => {
    expect(commandBlock(`${'eval '.repeat(6)}git push -f`)?.detail).toBe('git write nested too deep to check')
    expect(commandBlock(`${'eval '.repeat(6)}git status`)).toBeNull()
  })

  test("reads $'...' quoting as a quote", () => {
    expect(commandBlock("git push $'--force'")?.guard).toBe('no-bypass')
  })

  test('refuses an oversized command only when it holds a git write', () => {
    const filler = 'x'.repeat(20_001)
    expect(commandBlock(`echo ${filler} && git push -f`)?.reason).toContain('too long to check')
    expect(commandBlock(`echo ${filler}`)).toBeNull()
  })

  test('ignores git words inside text and non-git programs', () => {
    expect(commandBlock('echo "git push --force"')).toBeNull()
    expect(commandBlock('grep -rn "git commit -n" docs')).toBeNull()
  })

  test('strips terminal control characters from what it shows', () => {
    const block = commandBlock('git commit -m "bad\u001b[31m red"')
    expect(block?.detail).not.toContain('\u001b')
  })
})

describe('spawnBlock', () => {
  test('blocks a spawn that passes model, and only that', () => {
    expect(spawnBlock({ subagentType: 'task', model: 'haiku', fork: false })?.guard).toBe('role-pin')
    expect(spawnBlock({ subagentType: 'task', fork: false })).toBeNull()
    expect(spawnBlock({ subagentType: 'task', model: 'haiku', fork: true })).toBeNull()
  })
})
