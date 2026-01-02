# Skills Manager - Video Tutorial Outline

**Duration**: 8-10 minutes
**Target Audience**: Developers and QA engineers working with AINative Studio IDE
**Format**: Screen recording with voiceover
**Level**: Beginner to Intermediate

---

## Tutorial Objectives

By the end of this tutorial, viewers will be able to:
1. Understand the Skills Manager architecture
2. Install and use official skills
3. Create custom skills
4. Test skills using the comprehensive test suite
5. Troubleshoot common issues

---

## Tutorial Structure

### Introduction (30 seconds)

**Visual**: AINative Studio IDE splash screen, Skills Manager interface

**Script**:
> "Welcome to the Skills Manager tutorial for AINative Studio IDE. The Skills Manager is a powerful system that extends the IDE's AI capabilities through modular, reusable skills. In this tutorial, we'll cover everything from using official skills to creating and testing your own custom skills."

**Key Points**:
- What is the Skills Manager
- Why skills are useful
- What you'll learn

---

### Section 1: Skills Manager Overview (1 minute)

**Visual**: Architecture diagram, file structure

**Script**:
> "The Skills Manager consists of four main phases: Core components including the parser and registry, CLI commands for user interaction, marketplace integration for discovering skills, and a set of official skills. Skills are markdown files with YAML frontmatter containing metadata and instructions for the AI."

**Screen Actions**:
1. Show directory structure: `.ainative/skills/`
2. Open sample skill file
3. Highlight frontmatter and content sections
4. Show skills list in IDE

**Key Points**:
- Skills are markdown files
- Frontmatter contains metadata
- Content contains instructions
- Skills can have dependencies

---

### Section 2: Using Official Skills (2 minutes)

**Visual**: Command palette, skills list, installation process

**Script**:
> "Let's start by installing and using an official skill. AINative Studio comes with five official skills covering CI/CD, code quality, database management, delivery checklists, and file placement."

**Screen Actions**:
1. Open command palette (Cmd/Ctrl+Shift+P)
2. Type `/skills` to list available skills
   ```
   /skills
   ```
3. Show the list of official skills with descriptions
4. Install the `code-quality` skill:
   ```
   /skill install code-quality
   ```
5. Verify installation success message
6. Use the skill in a chat session:
   - Open AI chat sidebar
   - Invoke the skill: `@code-quality`
   - Show the skill's guidance in action

**Key Points**:
- Official skills are pre-installed or easily installable
- Use `/skills` to see all available skills
- Use `/skill install [name]` to install
- Skills integrate seamlessly with AI chat

**Troubleshooting Note**:
> "If installation fails, check your network connection and ensure you have write permissions to the skills directory."

---

### Section 3: Creating a Custom Skill (2.5 minutes)

**Visual**: Text editor, file creation, skill structure

**Script**:
> "Now let's create a custom skill. We'll build a simple skill that helps with writing unit tests. Custom skills follow the same structure as official skills."

**Screen Actions**:

1. **Navigate to skills directory**:
   ```bash
   cd ~/.ainative/skills/
   ```

2. **Create new skill file**:
   ```bash
   touch my-test-helper.md
   ```

3. **Add frontmatter** (type this in the editor):
   ```markdown
   ---
   name: my-test-helper
   description: Helps write comprehensive unit tests
   version: 1.0.0
   author: Your Name
   tags: [testing, unit-tests, quality]
   dependencies: []
   ---
   ```

4. **Add content**:
   ```markdown
   # Test Helper Skill

   When writing unit tests, follow these guidelines:

   ## Test Structure
   - Use BDD-style describe/it blocks
   - Follow Given-When-Then pattern
   - Write descriptive test names

   ## Coverage
   - Aim for 80%+ code coverage
   - Test happy paths and error cases
   - Include edge cases

   ## Best Practices
   - Keep tests isolated and independent
   - Use meaningful assertions
   - Mock external dependencies
   ```

5. **Save the file**

6. **Verify the skill appears**:
   ```
   /skills
   ```
   - Show the new skill in the list

7. **Test the skill**:
   - Use it in a chat session
   - Ask AI to "write tests for this function using @my-test-helper"

**Key Points**:
- Skills are just markdown files
- Frontmatter is required
- Content can be structured with markdown
- File watcher auto-detects new skills

---

### Section 4: Searching and Managing Skills (1 minute)

**Visual**: Command palette, search results, skill info

**Script**:
> "The Skills Manager provides powerful search and management capabilities. Let's explore how to find and manage skills."

**Screen Actions**:

1. **Search by tag**:
   ```
   /skills search tag:testing
   ```
   - Show filtered results

2. **Get skill information**:
   ```
   /skill info code-quality
   ```
   - Display detailed metadata

3. **Remove a skill**:
   ```
   /skill remove my-old-skill
   ```
   - Show confirmation prompt
   - Confirm removal

4. **List all skills again**:
   ```
   /skills
   ```

**Key Points**:
- Search by tags for discovery
- Get detailed info before installing
- Easy skill removal

---

### Section 5: Testing Your Skills (2 minutes)

**Visual**: Terminal, test execution, coverage report

**Script**:
> "Quality is crucial. Let's look at how to test skills using the comprehensive test suite built into AINative Studio."

**Screen Actions**:

1. **Navigate to project directory**:
   ```bash
   cd /Users/aideveloper/AINativeStudio-IDE/ainative-studio
   ```

2. **Run Skills Manager tests**:
   ```bash
   npm run test-node -- --grep "Skills Manager"
   ```
   - Show tests executing
   - Highlight passing tests

3. **Run with coverage**:
   ```bash
   npm run test-node -- --coverage --grep "Skills Manager"
   ```
   - Show coverage percentages
   - Point out coverage requirements

4. **View coverage report**:
   ```bash
   open .build/coverage/index.html
   ```
   - Show HTML coverage report
   - Navigate to specific components
   - Highlight covered/uncovered lines

5. **Run specific test file**:
   ```bash
   npm run test-node -- --run src/vs/workbench/contrib/void/test/browser/skillParser.test.ts
   ```

**Key Points**:
- Tests ensure quality
- Coverage >= 80% required
- Easy to run and view results
- Tests follow BDD style

---

### Section 6: Troubleshooting Common Issues (1 minute)

**Visual**: Error messages, solutions, documentation

**Script**:
> "Let's cover some common issues you might encounter and how to resolve them."

**Common Issues Table**:

| Issue | Solution |
|-------|----------|
| **Skill not appearing** | Check frontmatter syntax, ensure file saved |
| **Invalid YAML error** | Validate YAML syntax, check quotes and brackets |
| **Dependency not found** | Install required dependency first |
| **Circular dependency** | Review and break dependency cycle |
| **Installation fails** | Check network, verify marketplace access |

**Screen Actions**:
1. Show example of invalid YAML error
2. Demonstrate fix
3. Show successful re-load
4. Point to documentation for more help

**Resources**:
- Test Plan: `docs/testing/SKILLS_MANAGER_TEST_PLAN.md`
- Bug Template: `docs/testing/BUG_REPORT_TEMPLATE.md`
- GitHub Issues: [link]

---

### Section 7: Advanced Features (30 seconds)

**Visual**: Dependency graph, marketplace, version management

**Script**:
> "The Skills Manager includes advanced features like automatic dependency resolution, marketplace integration for discovering community skills, and version management for keeping skills up to date."

**Screen Actions**:
1. Show skill with dependencies
2. Demonstrate auto-installation of dependencies
3. Preview marketplace search
4. Show version update notification

**Key Points**:
- Dependencies auto-resolve
- Marketplace coming soon
- Version management built-in

---

### Conclusion (30 seconds)

**Visual**: Summary slide, call to action

**Script**:
> "You've now learned how to use the Skills Manager in AINative Studio IDE. You can install official skills, create custom skills, search and manage your skill library, and run comprehensive tests. For more information, check out the documentation in the docs/testing directory. Happy coding!"

**On-Screen Summary**:
- ✅ Install official skills with `/skill install`
- ✅ Create custom skills as markdown files
- ✅ Search with `/skills search tag:name`
- ✅ Test with `npm run test-node`
- ✅ Explore documentation for advanced features

**Call to Action**:
- Try creating your first custom skill
- Explore the official skills library
- Contribute to the community
- Report issues on GitHub

---

## Production Checklist

### Pre-Recording

- [ ] **Script Review**: Proofread and rehearse
- [ ] **Screen Setup**: Clean desktop, close unnecessary apps
- [ ] **IDE Setup**: Fresh install, default settings
- [ ] **Test Data**: Prepare sample files and skills
- [ ] **Timing**: Rehearse to ensure < 10 minutes

### Recording

- [ ] **Resolution**: 1920x1080 or higher
- [ ] **Frame Rate**: 30fps minimum
- [ ] **Audio**: Clear microphone, no background noise
- [ ] **Cursor**: Enable cursor highlighting
- [ ] **Font Size**: Increase for visibility (16-18pt)
- [ ] **Theme**: High contrast for clarity

### Post-Production

- [ ] **Editing**: Remove mistakes, add transitions
- [ ] **Captions**: Add closed captions
- [ ] **Chapters**: Add timeline markers
- [ ] **Branding**: Add intro/outro with AINative branding
- [ ] **Quality Check**: Review entire video
- [ ] **Export**: High quality (1080p), H.264 codec

---

## Equipment and Software

### Required Software

- **Screen Recording**: OBS Studio, Camtasia, or ScreenFlow
- **Video Editing**: DaVinci Resolve, Final Cut Pro, or Premiere Pro
- **Audio Recording**: Audacity or built-in recording
- **IDE**: AINative Studio IDE (latest version)

### Optional

- **Microphone**: USB condenser microphone for better audio
- **Graphics**: Figma or Sketch for creating diagrams
- **Captions**: Rev.com or YouTube auto-captions

---

## Video Hosting and Distribution

### Platforms

1. **YouTube**: Primary hosting
   - Unlisted or public based on preference
   - Enable chapters
   - Add to playlist

2. **Documentation**: Embed in docs
   - Add iframe embed code
   - Provide download link

3. **GitHub**: Link in README
   - Add to project wiki
   - Include in release notes

---

## Metrics and Success Criteria

### Video Metrics to Track

- **Views**: Target 1000+ in first month
- **Watch Time**: Average > 70% completion
- **Engagement**: Likes, comments, shares
- **Click-through**: Links to documentation

### Success Indicators

- [ ] Positive viewer feedback
- [ ] Reduced support questions
- [ ] Increased skill adoption
- [ ] Community contributions

---

## Update Schedule

**Review Frequency**: Quarterly or when major features added

**Update Triggers**:
- New skills released
- UI changes
- Feature additions
- Critical bug fixes

**Version Control**:
- v1.0: Initial release
- v1.1: Minor updates
- v2.0: Major feature additions

---

## Accessibility

### Requirements

- [ ] **Closed Captions**: Full transcription
- [ ] **Audio Description**: For visual elements
- [ ] **Transcript**: Text version available
- [ ] **Keyboard Navigation**: Demo includes keyboard shortcuts
- [ ] **Color Contrast**: High contrast theme

### Inclusive Language

- Use simple, clear language
- Avoid jargon or explain when necessary
- Include examples for different skill levels
- Provide alternative approaches

---

**Document Version**: 1.0
**Last Updated**: 2026-01-02
**Next Review**: 2026-04-02
