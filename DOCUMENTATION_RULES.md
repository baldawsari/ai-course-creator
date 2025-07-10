# DOCUMENTATION_RULES.md

This file contains the rules for Claude Code to automatically decide where to update documentation when the user says "update memory" or asks for documentation updates.

## 🎯 **Automatic Decision Framework for Documentation Updates**

When Claude Code receives a request to update documentation, follow this decision tree:

### **File Selection Rules**

#### **1. CLAUDE.md (Main File) - Update When:**
- **Core project changes** (new tech stack components, major architecture shifts)
- **Development workflow changes** (new npm scripts, build processes)  
- **Environment setup changes** (new required environment variables)
- **Critical fixes that affect the entire system**
- **File size limit:** Keep under 30,000 characters

**❌ DON'T add:** Detailed service implementations, specific API endpoints, utility functions

#### **2. docs/ARCHITECTURE.md - Update When:**
- **New services or components** added to the system
- **Database schema changes** (new tables, major migrations)
- **Authentication/authorization changes** (new auth methods, permission changes)
- **Major architectural decisions** (switching databases, adding message queues)
- **File size limit:** Keep under 15,000 characters

**❌ DON'T add:** Implementation details, code examples, specific API calls

#### **3. docs/SERVICES.md - Update When:**
- **New service implementations** (new AI integrations, processing pipelines)
- **Service configuration changes** (new parameters, optimization settings)
- **Service integration patterns** (how services communicate)
- **Performance optimizations** for existing services
- **File size limit:** Keep under 15,000 characters

**❌ DON'T add:** API endpoint documentation, testing procedures

#### **4. docs/API.md - Update When:**
- **New API endpoints** (routes, methods, parameters)
- **API response format changes**
- **Authentication requirements for APIs**
- **Rate limiting or API versioning changes**
- **File size limit:** Keep under 15,000 characters

**❌ DON'T add:** Internal service logic, database queries

#### **5. docs/TESTING.md - Update When:**
- **New testing strategies** (new test types, frameworks)
- **Testing environment changes** (new setup procedures)
- **CI/CD testing changes** (new automated test suites)
- **Test coverage requirements** or reporting changes
- **File size limit:** Keep under 15,000 characters

**❌ DON'T add:** Individual test cases, bug reports

#### **6. docs/UTILITIES.md - Update When:**
- **New utility functions** (new validation, processing, or helper functions)
- **Utility integration examples** (how to use utilities in services)
- **Performance optimization utilities**
- **Security or validation enhancements**
- **File size limit:** Keep under 15,000 characters

**❌ DON'T add:** Service-specific logic, API documentation

## 🆕 **New File Creation Rules**

### **Create a New File When:**

1. **New Major Feature Area** (>5k characters of documentation)
   ```
   docs/FRONTEND.md     # If adding React frontend documentation
   docs/DEPLOYMENT.md   # If adding deployment/DevOps documentation
   docs/SECURITY.md     # If adding comprehensive security guidelines
   ```

2. **Specialized Domain Knowledge**
   ```
   docs/AI_MODELS.md    # Detailed AI model configurations
   docs/INTEGRATIONS.md # Third-party service integrations
   docs/TROUBLESHOOTING.md # Common issues and solutions
   ```

3. **Role-Specific Documentation**
   ```
   docs/ADMIN.md        # Administrator-specific procedures
   docs/DEVELOPER.md    # Developer onboarding guide
   docs/API_REFERENCE.md # Complete API reference (if API.md gets too large)
   ```

### **File Naming Convention:**
- Use **UPPERCASE.md** for main documentation files
- Use **lowercase/** for subdirectories
- Use **descriptive names** that clearly indicate content

## 📝 **Automatic Decision Examples**

### **Example 1: User adds a new AI service (e.g., OpenAI Integration)**
**Claude Code should automatically:**
- **CLAUDE.md:** Add OpenAI to tech stack list, add required environment variables
- **docs/ARCHITECTURE.md:** Update service architecture diagram, mention new AI service component  
- **docs/SERVICES.md:** Full implementation details, configuration, integration patterns
- **docs/API.md:** New API endpoints for OpenAI integration
- **docs/TESTING.md:** New test commands for OpenAI service validation

### **Example 2: User adds new user roles and permissions**
**Claude Code should automatically:**
- **CLAUDE.md:** Mention major authentication change in recent updates
- **docs/ARCHITECTURE.md:** Update authentication/authorization section with new roles
- **docs/API.md:** Document role-based endpoint access requirements
- **docs/TESTING.md:** Add role-based testing procedures

### **Example 3: User adds a new utility for PDF processing**
**Claude Code should automatically:**
- **docs/UTILITIES.md:** Full utility documentation, examples, integration guide
- **docs/SERVICES.md:** How the utility integrates with document processing service
- **docs/TESTING.md:** Add utility testing commands

## 🚦 **Quick Decision Algorithm**

When user says "update memory" with new information, Claude Code should:

1. **Analyze the information type:**
   - Code implementation details → SERVICES.md
   - API endpoints → API.md
   - Testing procedures → TESTING.md
   - Utility functions → UTILITIES.md
   - Architecture changes → ARCHITECTURE.md
   - Project-wide changes → CLAUDE.md

2. **Check file size constraints:**
   - If target file will exceed 15k characters → Consider splitting or creating new file , for CLAUDE.md allow up to 30k characters

3. **Determine update scope:**
   - Single file update → Update that file
   - Multi-file update → Update all relevant files with appropriate information

4. **Follow cross-referencing:**
   - Add links between related files
   - Update main CLAUDE.md navigation if new files created

## 🔄 **Maintenance Triggers**

**Claude Code should automatically suggest maintenance when:**
- Any file approaches 15,000 characters
- Duplicate information detected across files
- New major feature areas emerge (>5k chars of content)
- Monthly review requested by user

## ✅ **Implementation Instructions for Claude Code**

When user requests documentation updates:

1. **Read this file first** to understand the rules
2. **Classify the information** using the decision framework
3. **Check target file sizes** before updating
4. **Update appropriate files** following the rules
5. **Add cross-references** where relevant
6. **Inform user** which files were updated and why

## 🎛️ **User Override Commands**

User can override automatic decisions with:
- "Add to [specific file]" - Force addition to specific file
- "Create new file [filename]" - Force new file creation
- "Don't update [filename]" - Exclude specific files from updates
- "Split [filename]" - Request file splitting when too large

## 📊 **Success Metrics**

Documentation is well-organized when:
- Each file has a single, clear purpose
- No file exceeds 15,000 characters
- Information is easy to find (max 2 clicks from main file)
- No duplicate information across files
- Cross-references are maintained and accurate

---

**This file should be referenced every time documentation updates are requested to ensure consistent, organized, and maintainable documentation structure.**