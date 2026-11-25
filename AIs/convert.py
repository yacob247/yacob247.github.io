#!/usr/bin/env python3
import sys, os, onnx, onnx.numpy_helper as nph, numpy as np
from onnx import helper, AttributeProto

INPUT  = sys.argv[1] if len(sys.argv) > 1 else "model.onnx"
OUT_DIR = os.path.dirname(INPUT)
OUTPUT = os.path.join(OUT_DIR, "model_nchw.onnx")

if not os.path.exists(INPUT):
    print(f"ERROR: {INPUT} not found."); exit(1)

print(f"Loading {INPUT} ({os.path.getsize(INPUT)//1048576} MB)...")
model = onnx.load(INPUT, load_external_data=True)
graph = model.graph
initializers = {init.name: init for init in graph.initializer}

new_nodes, conversions = [], 0
for node in graph.node:
    if node.op_type == "NhwcConv":
        inp, weight_name = node.input[0], node.input[1]
        bias_name = node.input[2] if len(node.input) > 2 else None
        new_weight_name = weight_name + "_oihw"
        if weight_name in initializers:
            w = nph.to_array(initializers[weight_name])
            graph.initializer.append(nph.from_array(np.transpose(w, (3,2,0,1)).astype(np.float32), name=new_weight_name))
        else:
            new_nodes.append(helper.make_node("Transpose", [weight_name], [new_weight_name], perm=[3,2,0,1]))
        inp_nchw = inp + "_nchw"
        out_nchw = node.output[0] + "_nchw"
        new_nodes.append(helper.make_node("Transpose", [inp], [inp_nchw], perm=[0,3,1,2]))
        conv_inputs = [inp_nchw, new_weight_name] + ([bias_name] if bias_name else [])
        conv_node = helper.make_node("Conv", conv_inputs, [out_nchw])
        for a in node.attribute:
            if a.type == AttributeProto.INTS:
                conv_node.attribute.append(helper.make_attribute(a.name, list(a.ints)))
            elif a.type == AttributeProto.INT:
                conv_node.attribute.append(helper.make_attribute(a.name, a.i))
            elif a.type == AttributeProto.FLOAT:
                conv_node.attribute.append(helper.make_attribute(a.name, a.f))
            elif a.type == AttributeProto.STRING:
                conv_node.attribute.append(helper.make_attribute(a.name, a.s))
        new_nodes.append(conv_node)
        new_nodes.append(helper.make_node("Transpose", [out_nchw], [node.output[0]], perm=[0,2,3,1]))
        conversions += 1
    else:
        new_nodes.append(node)

del graph.node[:]
graph.node.extend(new_nodes)
print(f"Converted {conversions} NhwcConv nodes.")

# Save with external data to bypass 2GB protobuf limit
ext_data = "model_nchw.onnx.data"
print(f"Saving with external data (model >2GB)...")
onnx.save_model(
    model, OUTPUT,
    save_as_external_data=True,
    all_tensors_to_one_file=True,
    location=ext_data,
    size_threshold=1024
)
print(f"Saved: {OUTPUT} + {ext_data}")
print(f"Upload BOTH files to R2 at: sd-turbo/unet/onnx/")