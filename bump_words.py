import os

PATCHES = {
    'tools2/envizion_editor.html': '<p>The editor interface is divided into logical sections for HTML, CSS, and JavaScript input, with a combined preview panel that shows the rendered result. This separation makes it easy to locate and edit specific parts of your code. Error highlighting helps identify syntax issues before they cause problems in your projects. The tool is particularly valuable for learning responsive design techniques, testing cross-browser compatibility patterns, and experimenting with modern CSS features.</p>',
    'tools2/envizion_playground.html': '<p>The playground supports multiple input panels that can be arranged to suit your workflow. You can focus on a single technology or work across HTML, CSS, and JavaScript simultaneously. The environment is designed to mimic a full development workspace while eliminating setup friction. Use it to validate concepts before committing to a full implementation.</p>',
    'tools2/luma_dashboard_clone.html': '<p>The dashboard layout follows modern UI design principles with clear visual hierarchy, consistent spacing, and intuitive information grouping. Each metric card provides context through labels and values that help users understand data at a glance. The responsive design ensures the dashboard remains usable across desktop and mobile devices.</p>',
}

for fp, patch in PATCHES.items():
    content = open(fp, 'r', encoding='utf-8').read()
    # Find last </section> and insert before it
    idx = content.rfind('</section>')
    if idx > 0:
        content = content[:idx] + patch + '\n' + content[idx:]
        open(fp, 'w', encoding='utf-8').write(content)
        print(f'OK: {fp}')
    else:
        print(f'FAIL: {fp}')
print('Done!')