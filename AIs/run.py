#!/usr/bin/env python3
"""
Convert sd-turbo unet from NHWC (NhwcConv) to standard NCHW (Conv)
so it can run on WASM EP (no NhwcConv contrib op required).

Usage:
  pip install onnx onnxruntime onnx-graphsurgeon numpy
  python convert_unet_nchw.py --input unet/onnx/model.onnx --output unet/onnx/model_nchw.onnx
"""

import argparse
import onnx
import onnx.numpy_helper as nph
import numpy as np
from onnx import helper, TensorProto

def nhwc_conv_to_nchw(model):
    graph = model.graph
    nodes = list(graph.node)
    initializers = {init.name: init for init in graph.initializer}
    new_nodes = []
    conversions = 0

    for node in nodes:
        if node.op_type == "NhwcConv" and node.domain in ("com.microsoft", ""):
            # NhwcConv: input is NHWC, weight is HWIO (height,width,in,out)
            # Standard Conv: input is NCHW, weight is OIHW
            inp, weight_name = node.input[0], node.input[1]
            bias_name = node.input[2] if len(node.input) > 2 else None

            # Transpose weight from HWIO -> OIHW
            if weight_name in initializers:
                w_init = initializers[weight_name]
                w = nph.to_array(w_init)  # shape: [H, W, I, O]
                w_nchw = np.transpose(w, (3, 2, 0, 1))  # -> [O, I, H, W]
                new_init = nph.from_array(w_nchw.astype(np.float32), name=weight_name + "_nchw")
                graph.initializer.append(new_init)
                new_weight_name = weight_name + "_nchw"
            else:
                # Runtime weight — insert transpose node
                new_weight_name = weight_name + "_nchw"
                graph.node.insert(0, helper.make_node(
                    "Transpose", inputs=[weight_name], outputs=[new_weight_name],
                    perm=[3, 2, 0, 1]
                ))

            # Insert transpose: NHWC -> NCHW before conv input
            transposed_input = inp + "_nchw_in"
            pre_transpose = helper.make_node(
                "Transpose", inputs=[inp], outputs=[transposed_input], perm=[0, 3, 1, 2]
            )

            # Build standard Conv node
            conv_output_nchw = node.output[0] + "_nchw_out"
            conv_inputs = [transposed_input, new_weight_name]
            if bias_name:
                conv_inputs.append(bias_name)

            attrs = {}
            for attr in node.attribute:
                if attr.name in ("dilations", "group", "kernel_shape", "pads", "strides", "auto_pad"):
                    attrs[attr.name] = list(attr.ints) if attr.ints else attr.i

            conv_node = helper.make_node(
                "Conv", inputs=conv_inputs, outputs=[conv_output_nchw], **attrs
            )

            # Insert transpose: NCHW -> NHWC after conv (preserve downstream layout)
            post_transpose = helper.make_node(
                "Transpose", inputs=[conv_output_nchw], outputs=[node.output[0]], perm=[0, 2, 3, 1]
            )

            new_nodes.extend([pre_transpose, conv_node, post_transpose])
            conversions += 1
        else:
            new_nodes.append(node)

    del graph.node[:]
    graph.node.extend(new_nodes)
    print(f"Converted {conversions} NhwcConv -> Conv nodes")
    return model

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    print(f"Loading {args.input}...")
    model = onnx.load(args.input)
    print(f"Original ops: {set(n.op_type for n in model.graph.node)}")

    model = nhwc_conv_to_nchw(model)

    print(f"Remaining ops: {set(n.op_type for n in model.graph.node)}")
    onnx.checker.check_model(model)
    onnx.save(model, args.output)
    print(f"Saved to {args.output}")

if __name__ == "__main__":
    main()