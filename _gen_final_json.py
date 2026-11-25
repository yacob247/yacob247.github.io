import os, json

ROOT = r'c:\Users\youse\Downloads\yacob247.github.io-main\yacob247.github.io-main'

inv = json.load(open(os.path.join(ROOT,'ENVIZION_FUNCTION_INVENTORY.json'),encoding='utf-8'))
bm = json.load(open(os.path.join(ROOT,'button-operation-map.json'),encoding='utf-8'))['records']

inv_by_name = {}
for fi in inv:
    inv_by_name.setdefault(fi['name'], []).append(fi)

ui_ui = ['toast','modal','open','close','alert','confirm','popup','menu','drawer','createElement','appendChild','addEventListener','onclick','onchange','onsubmit','onload','show','hide','drawUI','updateUi']
ui_human = ['fileupload','folderupload','voiceinput','prompt','confirm','createNewFolder']
ui_human_extra = ['triggerfileupload','triggerfolderupload','triggervoiceinput','createNewFolder','trigger']

def classify(name):
    if any(k in name.lower() for k in ui_ui):
        return 'UI-only helpers that should not be exposed as meaningful tools'
    if any(k in name.lower() for k in ui_human):
        return 'Human interaction required'
    if name in triggered_set:
        return 'Directly callable'
    if any(k in name.lower() for k in ['click','hover','scroll','focus','init','load','ready']):
        return 'UI event handler'
    return 'Unresolved operation'

def safety_for(name):
    if any(k in name.lower() for k in ui_ui):
        return 'UI helper (not meaningful operation)'
    if any(k in name.lower() for k in ['delete','remove','clear','reset']):
        return 'REQUIRES CONFIRMATION'
    if any(k in name.lower() for k in ['upload','transfer','send','share','peer','socket']):
        return 'REQUIRES CONFIRMATION'
    if any(k in name.lower() for k in ['download','export','convert','compress','optimize','upscale','mask','transcribe','watermark','render','merge','split','extract']):
        return 'SAFE'
    if any(k in name.lower() for k in ui_human):
        return 'HUMAN INTERACTION REQUIRED'
    return 'UNKNOWN'

ops = []
for fn in inv:
    name = fn['name']
    occurrences = inv_by_name[name]
    primary = next((o for o in occurrences if 'jaavscripts' in o['file']), occurrences[0])
    dup_files = [o['file'] for o in occurrences if o['file'] != primary['file']]
    trig = sum(1 for r in bm if name in r.get('called_functions', []))
    triggered = trig > 0

    cat = classify(name)
    safety = safety_for(name)
    human_interaction = any(k in name.lower() for k in ui_human + ['trigger'])

    req_state = []
    if any(k in name.lower() for k in ['selectedfile','applicationfiles','compresstoggle','outputformatselect']):
        req_state.append('Data file selection or upload')
    if any(k in name.lower() for k in ['animationdata','currentmodel']):
        req_state.append('Animation data, current model loaded')
    if any(k in name.lower() for k in ['historyundo','historyredo']):
        req_state.append('Undo/redo history state')
    if any(k in name.lower() for k in ['settingsmodalopen']):
        req_state.append('Settings modal state')
    if any(k in name.lower() for k in ['quicksave']):
        req_state.append('Workspace data to be saved')

    side_effects = []
    if any(k in name.lower() for k in ['download','export','save','zip']):
        side_effects.append('Creates download')
    if any(k in name.lower() for k in ['upload','transfer','send','peer','socket']):
        side_effects.append('May transmit data externally')
    if any(k in name.lower() for k in ['toast','modal','alert']):
        side_effects.append('Shows UI notification')
    side_effects_str = '; '.join(side_effects) if side_effects else 'none'

    modifies_user_data = any(k in name.lower() for k in ['save','update','set','add'])
    deletes_user_data = any(k in name.lower() for k in ['delete','remove','clear','reset'])
    uploads_files = any(k in name.lower() for k in ['upload','import'])
    downloads_files = any(k in name.lower() for k in ['download','export','saveas'])
    communicates_external = any(k in name.lower() for k in ['peer','socket','api','send','share','external'])

    entry = {
        'operationId': name,
        'name': name,
        'description': 'Function defined in ' + fn['file'] + ' (line ' + str(fn['line']) + ')',
        'sourceFile': primary['file'],
        'sourceLine': primary['line'],
        'functionSignature': fn.get('signature',''),
        'parameterNames': [],
        'requiredState': req_state,
        'expectedResult': 'Function may return a value or modify DOM/state',
        'sideEffects': side_effects_str,
        'modifiesUserData': modifies_user_data,
        'deletesUserData': deletes_user_data,
        'uploadsFiles': uploads_files,
        'downloadsFiles': downloads_files,
        'communicatesExternal': communicates_external,
        'requiresConfirmation': False,
        'requiresHumanInteraction': human_interaction,
        'callableFromSupperAI': True,
        'runtimeTestStatus': 'NOT TESTED',
        'category': cat,
        'safety': safety,
        'sourceVerified': True,
        'runtimeExecutionTested': False,
        'triggeredByButton': triggered,
        'triggeredCount': trig,
        'duplicateFiles': dup_files,
        'files': primary['file'],
    }
    ops.append(entry)

cat_order = {'Directly callable':0,'Unresolved operation':1,'Human interaction required':2,'UI event handler':3,'UI-only helpers that should not be exposed as meaningful tools':4}
ops.sort(key=lambda x:(cat_order.get(x['category'],9), x['name']))

with open(os.path.join(ROOT,'ENVIZION_FINAL_OPERATION_REGISTRY.json'),'w',encoding='utf-8') as f:
    json.dump(ops, f, indent=2)

print('Generated ENVIZION_FINAL_OPERATION_REGISTRY.json')
print('Operations:', len(ops))
